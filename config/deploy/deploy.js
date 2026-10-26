#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = 'dist';
const ROOT_DIR = process.cwd();

const log = {
  info: (msg) => console.log(`\n\x1b[36mℹ ${msg}\x1b[0m`),
  step: (msg) => console.log(`\x1b[33m➔ ${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✔ ${msg}\x1b[0m`),
  error: (msg) => console.error(`\n\x1b[31m✖ ${msg}\x1b[0m`),
  dim: (msg) => console.log(`\x1b[90m${msg}\x1b[0m`),
};

const exec = (cmd, cwd = ROOT_DIR) => {
  execSync(cmd, { stdio: 'inherit', cwd });
};

function loadEnvironment(mode) {
  const modeEnv = path.resolve(ROOT_DIR, `.env.${mode}`);
  const defaultEnv = path.resolve(ROOT_DIR, '.env');
  const envPath = fs.existsSync(modeEnv)
    ? modeEnv
    : fs.existsSync(defaultEnv)
      ? defaultEnv
      : null;

  if (envPath && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Игнорируем ошибки парсинга системного .env
    }
  }
}

function loadDeployConfig() {
  const localPath = path.resolve(__dirname, 'deploy.config.json');
  const rootPath = path.resolve(ROOT_DIR, 'deploy.config.json');

  const configPath = fs.existsSync(localPath) ? localPath : rootPath;

  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      log.error(`Ошибка чтения deploy.config.json: ${err.message}`);
    }
  }

  return {};
}

function loadPackageInfo() {
  const pkgPath = path.resolve(ROOT_DIR, 'package.json');
  if (fs.existsSync(pkgPath)) {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  }
  return { name: 'stairs-3d', version: '1.0.0' };
}

function buildProject(mode) {
  const buildCmd =
    mode === 'development' ? 'pnpm run build:app:dev' : 'pnpm run build:app:prod';
  log.step(`Шаг 1. Собираем проект (${buildCmd})...`);
  exec(buildCmd);

  const buildPath = path.resolve(ROOT_DIR, BUILD_DIR);
  if (!fs.existsSync(buildPath)) {
    throw new Error(`Папка "${BUILD_DIR}" не найдена после сборки!`);
  }
}

function pushBuildToGit({ buildPath, repoUrl, branch, pkg, mode }) {
  log.step(`Шаг 2. Пушим бандл в ветку [${branch}]...`);

  const gitDir = path.join(buildPath, '.git');
  if (fs.existsSync(gitDir)) {
    fs.rmSync(gitDir, { recursive: true, force: true });
  }

  const now = new Date();
  const versionData = {
    version: pkg.version || '1.0.0',
    mode,
    date: now.toLocaleString('ru-RU', { timeZone: 'Europe/Minsk' }),
    timestamp: now.getTime(),
  };

  fs.writeFileSync(
    path.join(buildPath, 'version.json'),
    JSON.stringify(versionData, null, 2)
  );

  try {
    exec('git init', buildPath);
    exec(`git checkout -B ${branch}`, buildPath);
    exec('git config user.email "deploy@bot"', buildPath);
    exec('git config user.name "Deploy Bot"', buildPath);
    exec('git add .', buildPath);
    exec(
      `git commit -m "Build ${versionData.version} (${mode}) — ${versionData.date}"`,
      buildPath
    );
    exec(`git remote add origin ${repoUrl}`, buildPath);
    exec(`git push origin ${branch} --force`, buildPath);

    log.success(`Бандл отправлен в ${repoUrl} [${branch}]`);
  } finally {
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }
  }

  return versionData;
}

async function triggerServerWebhooks(config, branch) {
  const autoDeploy =
    process.env.AUTO_DEPLOY_WEBHOOK !== undefined
      ? process.env.AUTO_DEPLOY_WEBHOOK === 'true'
      : config.autoDeployWebhook !== undefined
        ? config.autoDeployWebhook
        : true;

  if (!autoDeploy) {
    log.dim('Авто-вебхуки выключены.');
    return;
  }

  let servers = config.servers || [];

  if (process.env.DEPLOY_WEBHOOK_URL) {
    servers = [
      {
        name: 'Environment Server',
        enabled: true,
        webhookUrl: process.env.DEPLOY_WEBHOOK_URL,
        secret: process.env.DEPLOY_WEBHOOK_SECRET || '',
      },
    ];
  }

  const activeServers = servers.filter((s) => s.enabled && s.webhookUrl);

  if (activeServers.length === 0) {
    log.dim('Нет активных серверов для отправки вебхуков.');
    return;
  }

  log.step(`Шаг 3. Дергаем вебхуки серверов (${activeServers.length})...`);

  for (const server of activeServers) {
    if (!server.secret) {
      log.error(`Пропуск ${server.name}: не указан secret.`);
      continue;
    }

    try {
      log.dim(`➔ Запрос на ${server.name}...`);
      const res = await fetch(server.webhookUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${server.secret}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'ru',
        },
        body: JSON.stringify({ branch }),
      });
      const result = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      if (res.ok && result.status === 'success') {
        log.success(`[${server.name}] ${result.message || 'Обновлено'}`);
      } else {
        log.error(`[${server.name}] Ошибка: ${result.message || res.status}`);
      }
    } catch (err) {
      log.error(`[${server.name}] Ошибка сети: ${err.message}`);
    }
  }
}

(async () => {
  const modeArg = process.argv.find((a) => a.startsWith('--mode='));
  const mode = modeArg ? modeArg.split('=')[1] : 'production';

  loadEnvironment(mode);
  const config = loadDeployConfig();
  const pkg = loadPackageInfo();
  const repoUrl = process.env.DEPLOY_REPO_URL || config.repoUrl;
  const branch = process.env.DEPLOY_BRANCH || config.branch || 'deploy/build';
  const buildPath = path.resolve(ROOT_DIR, BUILD_DIR);

  log.info(`Деплой "${pkg.name}" [${mode}]`);
  buildProject(mode);
  pushBuildToGit({ buildPath, repoUrl, branch, pkg, mode });
  await triggerServerWebhooks(config, branch);
  log.success('Готово!\n');
})();