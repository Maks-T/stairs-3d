import {
  CORNER_CONFIG,
  RISER_THICKNESS_MM,
  RISER_TOP_CLEARANCE_MM,
  STEP_FRAME_CLEAR_SPAN_MM,
  STEP_FRAME_MODULE_DEPTH_MM,
  STEP_TREAD_DEPTH_MM,
  STEP_TREAD_THICKNESS_MM,
  PROFILE_TUBE_SIZE_MM as T,
  TOTAL_FRONT_OVERHANG_MM
} from '@/constants/stairs-config';
import type {
  BoxElement,
  TransverseSpacing
} from '@/types/stairs';
import { calculateSideCladdingPieces } from '../cladding-calculator';
import { calculateVisibleRiserHeight } from '../nodes/step-node-calculator';
import { calculateTransverseSpacing } from '../spacing-calculator';
import {
  calculateTierZBounds
} from './corner-geometry.helper';
import { buildCornerDiagonals, buildSideWingFrame, buildXJoistRow } from './corner-frame.helper';
import { buildPostGrid, distributeInteriorColumns } from './corner-posts.helper';
import type { StairCalculationContext, StairLayoutStrategy, StrategyLayout } from './stair-strategy.interface';


export class CornerSingleStairStrategy implements StairLayoutStrategy {
  constructor(private readonly side: 'left' | 'right') {}

  calculate(context: StairCalculationContext): StrategyLayout {
    const { widthMm, heightMm, stepCount, stepHeight, metrics, options } = context;
    const isLeft = this.side === 'left';
    const topFrameWidthMm = Math.max(T * 2, widthMm - 2 * RISER_THICKNESS_MM);

    const bottomTierIndex = stepCount - 1;
    const bottomFrameWidthMm = topFrameWidthMm + bottomTierIndex * STEP_FRAME_MODULE_DEPTH_MM;
    const totalDepth = stepCount * STEP_FRAME_MODULE_DEPTH_MM + metrics.frontOverhangMm;
    const visibleRiserHeight = calculateVisibleRiserHeight(stepHeight, STEP_TREAD_THICKNESS_MM);

    const spacing: TransverseSpacing = calculateTransverseSpacing(
      bottomFrameWidthMm,
      T,
      CORNER_CONFIG.TARGET_TRAPEZOID_SPAN_MM
    );

    const treads = this.generateTreads(stepCount, stepHeight, topFrameWidthMm, isLeft);
    const risers = options.hasRisers
      ? this.generateRisers(stepCount, stepHeight, topFrameWidthMm, isLeft)
      : [];
    const cladding = options.hasSideCladding
      ? this.generateStraightCladding(stepCount, stepHeight, topFrameWidthMm, isLeft)
      : [];

    const { tubes: frameTubes, totalLengthMm } = this.generateFrame(
      stepCount,
      stepHeight,
      topFrameWidthMm,
      isLeft
    );


    return {
      stairType: isLeft ? 'corner-left' : 'corner-right',
      stepCount,
      stepHeight,
      visibleRiserHeight,
      totalWidth: widthMm,
      totalHeight: heightMm,
      totalDepth,
      cladding,
      treads,
      risers,
      frameTubes,
      spacing,
      metrics,
      totalPipeLengthM: Number((totalLengthMm / 1000).toFixed(2))
    };
  }

  private generateTreads(
    stepCount: number,
    stepHeight: number,
    topFrameWidthMm: number,
    isLeft: boolean
  ): BoxElement[] {
    const treads: BoxElement[] = [];
    const halfTopWidth = topFrameWidthMm / 2;

    for (let stepIndex = 1; stepIndex <= stepCount; stepIndex++) {
      const tierFromTop = stepCount - stepIndex;
      const yCenter = stepIndex * stepHeight - STEP_TREAD_THICKNESS_MM / 2;
      const { zFront } = calculateTierZBounds(stepIndex, stepCount, STEP_FRAME_MODULE_DEPTH_MM);
      const zNose = zFront + TOTAL_FRONT_OVERHANG_MM;
      const zCenter = zNose - STEP_TREAD_DEPTH_MM / 2;

      const cornerExpansion = tierFromTop * STEP_FRAME_MODULE_DEPTH_MM;
      const xCorner = isLeft ? -halfTopWidth - cornerExpansion : halfTopWidth + cornerExpansion;
      const straightEnd = isLeft ? halfTopWidth : -halfTopWidth;
      const isTopLanding = stepIndex === stepCount;
      // Со стороны угла передняя ступень выступает на те же 34 мм, что и боковая, иначе линии торцовки 45° расходятся
      const frontOuterX = isLeft ? xCorner - TOTAL_FRONT_OVERHANG_MM : xCorner + TOTAL_FRONT_OVERHANG_MM;
      const straightOuterX = isLeft
        ? straightEnd + TOTAL_FRONT_OVERHANG_MM / 2
        : straightEnd - TOTAL_FRONT_OVERHANG_MM / 2;
      const frontLength = Math.abs(straightOuterX - frontOuterX);

      treads.push({
        id: `tread-front-${stepIndex}`,
        x: (frontOuterX + straightOuterX) / 2,
        y: yCenter,
        z: zCenter,
        width: frontLength,
        height: STEP_TREAD_THICKNESS_MM,
        depth: STEP_TREAD_DEPTH_MM,
        cutAngleLeftDeg: isLeft && !isTopLanding ? CORNER_CONFIG.MITER_ANGLE_DEG : 0,
        cutAngleRightDeg: !isLeft && !isTopLanding ? CORNER_CONFIG.MITER_ANGLE_DEG : 0
      });

      if (!isTopLanding) {
        const sideLength = zNose;
        const sideCenterZ = sideLength / 2;
        const sideX = isLeft
          ? xCorner - TOTAL_FRONT_OVERHANG_MM + STEP_TREAD_DEPTH_MM / 2
          : xCorner + TOTAL_FRONT_OVERHANG_MM - STEP_TREAD_DEPTH_MM / 2;

        treads.push({
          id: `tread-side-${stepIndex}`,
          x: sideX,
          y: yCenter,
          z: sideCenterZ,
          width: sideLength,
          height: STEP_TREAD_THICKNESS_MM,
          depth: STEP_TREAD_DEPTH_MM,
          rotationY: isLeft ? -Math.PI / 2 : Math.PI / 2,
          cutAngleLeftDeg: !isLeft ? CORNER_CONFIG.MITER_ANGLE_DEG : 0,
          cutAngleRightDeg: isLeft ? CORNER_CONFIG.MITER_ANGLE_DEG : 0
        });
      }
    }

    return treads;
  }

  private generateRisers(
    stepCount: number,
    stepHeight: number,
    topFrameWidthMm: number,
    isLeft: boolean
  ): BoxElement[] {
    const risers: BoxElement[] = [];
    const halfTopWidth = topFrameWidthMm / 2;
    const riserHeight = calculateVisibleRiserHeight(stepHeight, STEP_TREAD_THICKNESS_MM);
    const actualHeight = Math.max(0, riserHeight - RISER_TOP_CLEARANCE_MM);

    for (let stepIndex = 1; stepIndex <= stepCount; stepIndex++) {
      const tierFromTop = stepCount - stepIndex;
      const { zFront, zRear } = calculateTierZBounds(stepIndex, stepCount, STEP_FRAME_MODULE_DEPTH_MM);
      const yCenter = (stepIndex - 1) * stepHeight + actualHeight / 2;

      const cornerExpansion = tierFromTop * STEP_FRAME_MODULE_DEPTH_MM;
      const xCorner = isLeft ? -halfTopWidth - cornerExpansion : halfTopWidth + cornerExpansion;
      const straightEnd = isLeft ? halfTopWidth : -halfTopWidth;
      // Фронтальный подступенок перекрывает угол 11×11 мм над боковым, иначе в углу остаётся сквозная щель
      const frontOuterX = isLeft ? xCorner - RISER_THICKNESS_MM : xCorner + RISER_THICKNESS_MM;
      const frontLength = Math.abs(straightEnd - frontOuterX);

      risers.push({
        id: `riser-front-${stepIndex}`,
        x: (frontOuterX + straightEnd) / 2,
        y: yCenter,
        z: zFront + RISER_THICKNESS_MM / 2,
        width: frontLength,
        height: actualHeight,
        depth: RISER_THICKNESS_MM
      });

      const sideOuterLength = zFront;
      const sideOuterX = isLeft
        ? xCorner - RISER_THICKNESS_MM / 2
        : xCorner + RISER_THICKNESS_MM / 2;

      risers.push({
        id: `riser-side-outer-${stepIndex}`,
        x: sideOuterX,
        y: yCenter,
        z: sideOuterLength / 2,
        width: RISER_THICKNESS_MM,
        height: actualHeight,
        depth: sideOuterLength
      });

      if (stepIndex < stepCount) {
        const upperTierIndex = stepIndex + 1;
        const upperYCenter = stepIndex * stepHeight + actualHeight / 2;
        const xInner = isLeft
          ? xCorner + STEP_FRAME_MODULE_DEPTH_MM - RISER_THICKNESS_MM / 2
          : xCorner - STEP_FRAME_MODULE_DEPTH_MM + RISER_THICKNESS_MM / 2;

        risers.push({
          id: `riser-side-inner-${upperTierIndex}`,
          x: xInner,
          y: upperYCenter,
          z: zRear / 2,
          width: RISER_THICKNESS_MM,
          height: actualHeight,
          depth: zRear
        });
      }
    }

    return risers;
  }

  private generateStraightCladding(
    stepCount: number,
    stepHeight: number,
    topFrameWidthMm: number,
    isLeft: boolean
  ): BoxElement[] {
    const cladding: BoxElement[] = [];
    const straightX = isLeft
      ? topFrameWidthMm / 2 + RISER_THICKNESS_MM / 2
      : -topFrameWidthMm / 2 - RISER_THICKNESS_MM / 2;
    const sidePieces = calculateSideCladdingPieces(stepCount, stepHeight);

    let currentY = 0;
    sidePieces.forEach((piece) => {
      cladding.push({
        id: `cladding-straight-tier-${piece.tierIndex}`,
        x: straightX,
        y: currentY + piece.heightMm / 2,
        z: piece.lengthMm / 2,
        width: RISER_THICKNESS_MM,
        height: piece.heightMm,
        depth: piece.lengthMm
      });
      currentY += piece.heightMm;
    });

    return cladding;
  }

  private generateFrame(
    stepCount: number,
    stepHeight: number,
    topFrameWidthMm: number,
    isLeft: boolean
  ): { tubes: BoxElement[]; totalLengthMm: number } {
    const tubes: BoxElement[] = [];
    let totalLengthMm = 0;
    const halfTopWidth = topFrameWidthMm / 2;

    const addTube = (tube: BoxElement): void => {
      tubes.push(tube);
      totalLengthMm += Math.max(tube.width, tube.height, tube.depth);
    };

    for (let stepIndex = 1; stepIndex <= stepCount; stepIndex++) {
      const tierFromTop = stepCount - stepIndex;
      const stepY = stepIndex * stepHeight;
      const beamY = stepY - STEP_TREAD_THICKNESS_MM - T / 2;

      const { zFront, zRear } = calculateTierZBounds(stepIndex, stepCount, STEP_FRAME_MODULE_DEPTH_MM);
      const cornerExpansion = tierFromTop * STEP_FRAME_MODULE_DEPTH_MM;

      const xCorner = isLeft ? -halfTopWidth - cornerExpansion : halfTopWidth + cornerExpansion;
      const xInner = isLeft ? xCorner + STEP_FRAME_MODULE_DEPTH_MM : xCorner - STEP_FRAME_MODULE_DEPTH_MM;
      const straightEnd = isLeft ? halfTopWidth : -halfTopWidth;
      const isTopLanding = stepIndex === stepCount;
      const straightSideX = isLeft
        ? straightEnd - T / 2
        : straightEnd + T / 2;
      const cornerXPos = isLeft ? xCorner + T / 2 : xCorner - T / 2;

      if (isTopLanding) {
        const landingWidthMm = Math.abs(straightEnd - xCorner);
        [
          { id: `beam-front-lvl${stepIndex}`, z: zFront - T / 2 },
          { id: `beam-rear-lvl${stepIndex}`, z: zRear + T / 2 }
        ].forEach((b) => {
          addTube({
            id: b.id,
            x: (xCorner + straightEnd) / 2,
            y: beamY,
            z: b.z,
            width: landingWidthMm,
            height: T,
            depth: T
          });
        });

        [
          { id: `beam-straight-end-cap-lvl${stepIndex}`, x: straightSideX },
          { id: `beam-top-end-cap-lvl${stepIndex}`, x: cornerXPos }
        ].forEach((cap) => {
          addTube({
            id: cap.id,
            x: cap.x,
            y: beamY,
            z: (zFront + zRear) / 2,
            width: T,
            height: T,
            depth: STEP_FRAME_CLEAR_SPAN_MM
          });
        });

        buildXJoistRow({
          idPrefix: `joist-lvl${stepIndex}`,
          fromX: cornerXPos,
          toX: straightSideX,
          zFront,
          zRear,
          beamY,
          includeStartJoist: false,
          includeEndJoist: false
        }).forEach(addTube);
      } else {
        const prefix = `beam-${isLeft ? 'l' : 'r'}-lvl${stepIndex}`;

        // Боковое крыло до стены Z=0 и спаренные диагонали 204 мм вдоль стыка 45°
        buildSideWingFrame({
          idPrefix: prefix,
          isLeft,
          xOuter: xCorner,
          xInner,
          zFront,
          zRear,
          beamY
        }).forEach(addTube);

        buildCornerDiagonals({
          idPrefix: `${prefix}-diag`,
          isLeft,
          xOuter: xCorner,
          xInner,
          zFront,
          zRear,
          beamY
        }).forEach(addTube);


        // Полное замыкание фронтальной балки от внешнего угла до прямого торца
        const frontStartX = isLeft ? cornerXPos + T / 2 : straightSideX + T / 2;
        const frontEndX = isLeft ? straightSideX - T / 2 : cornerXPos - T / 2;
        const frontOuterW = Math.max(T, frontEndX - frontStartX);
        addTube({
          id: `beam-front-lvl${stepIndex}`,
          x: (frontStartX + frontEndX) / 2,
          y: beamY,
          z: zFront - T / 2,
          width: frontOuterW,
          height: T,
          depth: T
        });

        // Задняя продольная балка яруса от внутренней стойки угла до прямого торца
        // Балка стыкуется встык к грани внутренней балки крыла (без наложения и без выемки)
        const rearInnerStartX = isLeft ? xInner : straightSideX + T / 2;
        const rearInnerEndX = isLeft ? straightSideX - T / 2 : xInner;
        const frontInnerW = Math.max(0, rearInnerEndX - rearInnerStartX);
        if (frontInnerW > 0) {
          addTube({
            id: `beam-rear-lvl${stepIndex}`,
            x: (rearInnerStartX + rearInnerEndX) / 2,
            y: beamY,
            z: zRear + T / 2,
            width: frontInnerW,
            height: T,
            depth: T
          });
        }

        // Прямой торец марша на полную глубину яруса 271 мм
        addTube({
          id: `beam-straight-end-cap-lvl${stepIndex}`,
          x: straightSideX,
          y: beamY,
          z: (zFront + zRear) / 2,
          width: T,
          height: T,
          depth: STEP_FRAME_MODULE_DEPTH_MM
        });

        // Равномерные поперечины прямого участка с шагом не более 400 мм
        const joistFromX = isLeft
          ? xInner + CORNER_CONFIG.MIN_CORNER_JOIST_OFFSET_MM
          : xInner - CORNER_CONFIG.MIN_CORNER_JOIST_OFFSET_MM;
        buildXJoistRow({
          idPrefix: `joist-lvl${stepIndex}`,
          fromX: joistFromX,
          toX: straightSideX + (isLeft ? -T : T),
          zFront,
          zRear,
          beamY,
          includeStartJoist: true,
          includeEndJoist: false
        }).forEach(addTube);
      }
    }

    // Опоры: общая сетка независимо от поперечин. Ряды на осях передних балок ярусов и у стены,
    // колонки на крыле через модуль яруса, у прямого торца и в середине равномерно с шагом не больше предела
    const rowsZ: number[] = [T / 2];
    const wingColumns: number[] = [];
    for (let stepIndex = 1; stepIndex <= stepCount; stepIndex++) {
      const { zFront } = calculateTierZBounds(stepIndex, stepCount, STEP_FRAME_MODULE_DEPTH_MM);
      const expansion = (stepCount - stepIndex) * STEP_FRAME_MODULE_DEPTH_MM;
      const xCorner = isLeft ? -halfTopWidth - expansion : halfTopWidth + expansion;
      rowsZ.push(zFront - T / 2);
      wingColumns.push(isLeft ? xCorner + T / 2 : xCorner - T / 2);
    }
    const landingWingColumn = isLeft ? -halfTopWidth + T / 2 : halfTopWidth - T / 2;
    const straightEndColumn = isLeft ? halfTopWidth - T / 2 : -halfTopWidth + T / 2;
    buildPostGrid(
      tubes,
      [...wingColumns, straightEndColumn, ...distributeInteriorColumns(landingWingColumn, straightEndColumn)],
      rowsZ
    ).forEach(addTube);

    return { tubes, totalLengthMm };
  }
}
