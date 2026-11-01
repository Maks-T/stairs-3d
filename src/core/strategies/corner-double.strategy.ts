
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


export class CornerDoubleStairStrategy implements StairLayoutStrategy {
  calculate(context: StairCalculationContext): StrategyLayout {
    const { widthMm, heightMm, stepCount, stepHeight, metrics, options } = context;
    const topFrameWidthMm = Math.max(T * 4, widthMm - 2 * RISER_THICKNESS_MM);

    const bottomTierIndex = stepCount - 1;
    const bottomFrameWidthMm = topFrameWidthMm + 2 * bottomTierIndex * STEP_FRAME_MODULE_DEPTH_MM;
    const totalDepth = stepCount * STEP_FRAME_MODULE_DEPTH_MM + metrics.frontOverhangMm;
    const visibleRiserHeight = calculateVisibleRiserHeight(stepHeight, STEP_TREAD_THICKNESS_MM);

    const spacing: TransverseSpacing = calculateTransverseSpacing(
      bottomFrameWidthMm,
      T,
      CORNER_CONFIG.TARGET_TRAPEZOID_SPAN_MM
    );

    const treads = this.generateDoubleTreads(stepCount, stepHeight, topFrameWidthMm);
    const risers = options.hasRisers
      ? this.generateDoubleRisers(stepCount, stepHeight, topFrameWidthMm)
      : [];
    const cladding = options.hasSideCladding
      ? this.generateDoubleCladding(stepCount, stepHeight, topFrameWidthMm)
      : [];

    const { tubes: frameTubes, totalLengthMm } = this.generateDoubleFrame(
      stepCount,
      stepHeight,
      topFrameWidthMm
    );


    return {
      stairType: 'corner-double',
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

  private generateDoubleTreads(
    stepCount: number,
    stepHeight: number,
    topFrameWidthMm: number
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
      const xLeft = -halfTopWidth - cornerExpansion;
      const xRight = halfTopWidth + cornerExpansion;
      const isTopLanding = stepIndex === stepCount;

      const centerLength = (xRight - xLeft) + 2 * TOTAL_FRONT_OVERHANG_MM;

      treads.push({
        id: `tread-double-front-${stepIndex}`,
        x: 0,
        y: yCenter,
        z: zCenter,
        width: centerLength,
        height: STEP_TREAD_THICKNESS_MM,
        depth: STEP_TREAD_DEPTH_MM,
        cutAngleLeftDeg: !isTopLanding ? CORNER_CONFIG.MITER_ANGLE_DEG : 0,
        cutAngleRightDeg: !isTopLanding ? CORNER_CONFIG.MITER_ANGLE_DEG : 0
      });

      if (!isTopLanding) {
        const sideLength = zNose;
        const sideCenterZ = sideLength / 2;

        [-1, 1].forEach((dir) => {
          const isLeft = dir === -1;
          const xPos = isLeft
            ? xLeft - TOTAL_FRONT_OVERHANG_MM + STEP_TREAD_DEPTH_MM / 2
            : xRight + TOTAL_FRONT_OVERHANG_MM - STEP_TREAD_DEPTH_MM / 2;

          treads.push({
            id: `tread-double-${isLeft ? 'left' : 'right'}-${stepIndex}`,
            x: xPos,
            y: yCenter,
            z: sideCenterZ,
            width: sideLength,
            height: STEP_TREAD_THICKNESS_MM,
            depth: STEP_TREAD_DEPTH_MM,
            rotationY: isLeft ? -Math.PI / 2 : Math.PI / 2,
            cutAngleLeftDeg: !isLeft ? CORNER_CONFIG.MITER_ANGLE_DEG : 0,
            cutAngleRightDeg: isLeft ? CORNER_CONFIG.MITER_ANGLE_DEG : 0
          });
        });
      }
    }

    return treads;
  }

  private generateDoubleRisers(
    stepCount: number,
    stepHeight: number,
    topFrameWidthMm: number
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
      const xLeft = -halfTopWidth - cornerExpansion;
      const xRight = halfTopWidth + cornerExpansion;
      // Подступенок перекрывает углы 11×11 мм над боковыми, иначе в углах остаётся сквозная щель
      const centerLength = Math.max(T, xRight - xLeft) + 2 * RISER_THICKNESS_MM;

      risers.push({
        id: `riser-double-front-${stepIndex}`,
        x: 0,
        y: yCenter,
        z: zFront + RISER_THICKNESS_MM / 2,
        width: centerLength,
        height: actualHeight,
        depth: RISER_THICKNESS_MM
      });

      const sideOuterLength = zFront;
      [-1, 1].forEach((dir) => {
        const isLeft = dir === -1;
        const xOuter = isLeft
          ? xLeft - RISER_THICKNESS_MM / 2
          : xRight + RISER_THICKNESS_MM / 2;

        risers.push({
          id: `riser-double-side-outer-${isLeft ? 'l' : 'r'}-${stepIndex}`,
          x: xOuter,
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
            ? xLeft + STEP_FRAME_MODULE_DEPTH_MM - RISER_THICKNESS_MM / 2
            : xRight - STEP_FRAME_MODULE_DEPTH_MM + RISER_THICKNESS_MM / 2;

          risers.push({
            id: `riser-double-side-inner-${isLeft ? 'l' : 'r'}-${upperTierIndex}`,
            x: xInner,
            y: upperYCenter,
            z: zRear / 2,
            width: RISER_THICKNESS_MM,
            height: actualHeight,
            depth: zRear
          });
        }
      });
    }

    return risers;
  }

  private generateDoubleCladding(
    stepCount: number,
    stepHeight: number,
    topFrameWidthMm: number
  ): BoxElement[] {
    const cladding: BoxElement[] = [];
    const sidePieces = calculateSideCladdingPieces(stepCount, stepHeight);
    const sideX = topFrameWidthMm / 2 + RISER_THICKNESS_MM / 2;

    sidePieces.forEach((piece) => {
      const y = sidePieces
        .filter((candidate) => candidate.tierIndex < piece.tierIndex)
        .reduce((sum, candidate) => sum + candidate.heightMm, 0) + piece.heightMm / 2;

      [-1, 1].forEach((direction) => {
        cladding.push({
          id: `cladding-double-${direction < 0 ? 'left' : 'right'}-tier-${piece.tierIndex}`,
          x: direction * sideX,
          y,
          z: piece.lengthMm / 2,
          width: RISER_THICKNESS_MM,
          height: piece.heightMm,
          depth: piece.lengthMm
        });
      });
    });

    return cladding;
  }

  private generateDoubleFrame(
    stepCount: number,
    stepHeight: number,
    topFrameWidthMm: number
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
      const xLeft = -halfTopWidth - cornerExpansion;
      const xRight = halfTopWidth + cornerExpansion;
      const xInnerLeft = xLeft + STEP_FRAME_MODULE_DEPTH_MM;
      const xInnerRight = xRight - STEP_FRAME_MODULE_DEPTH_MM;
      const centerLength = Math.max(T, xRight - xLeft);
      const isTopLanding = stepIndex === stepCount;

      if (isTopLanding) {
        [
          { id: `beam-double-front-lvl${stepIndex}`, z: zFront - T / 2 },
          { id: `beam-double-rear-lvl${stepIndex}`, z: zRear + T / 2 }
        ].forEach((beam) => {
          addTube({
            id: beam.id,
            x: 0,
            y: beamY,
            z: beam.z,
            width: centerLength,
            height: T,
            depth: T
          });
        });

        [-halfTopWidth + T / 2, halfTopWidth - T / 2].forEach((xSide, sIdx) => {
          const side = sIdx === 0 ? 'l' : 'r';
          addTube({
            id: `beam-top-landing-cap-${side}`,
            x: xSide,
            y: beamY,
            z: (zFront + zRear) / 2,
            width: T,
            height: T,
            depth: STEP_FRAME_CLEAR_SPAN_MM
          });
        });

        buildXJoistRow({
          idPrefix: `joist-double-lvl${stepIndex}`,
          fromX: -halfTopWidth + T / 2,
          toX: halfTopWidth - T / 2,
          zFront,
          zRear,
          beamY,
          includeStartJoist: false,
          includeEndJoist: false
        }).forEach(addTube);
      } else {
        // Фронтальная балка марша между внешними боковинами крыльев
        addTube({
          id: `beam-double-front-lvl${stepIndex}`,
          x: 0,
          y: beamY,
          z: zFront - T / 2,
          width: (xRight - xLeft) - 2 * T,
          height: T,
          depth: T
        });

        // Задняя фронтальная балка перекрывает весь пролет между крыльями до плоскостей xInner
        const frontInnerW = Math.max(0, xInnerRight - xInnerLeft);
        if (frontInnerW > 0) {
          addTube({
            id: `beam-double-rear-lvl${stepIndex}`,
            x: 0,
            y: beamY,
            z: zRear + T / 2,
            width: frontInnerW,
            height: T,
            depth: T
          });
        }

        // Формирование боковых крыльев и диагоналей с обеих сторон
        [-1, 1].forEach((dir) => {
          const isLeft = dir === -1;
          const xOuter = isLeft ? xLeft : xRight;
          const xInner = isLeft ? xInnerLeft : xInnerRight;
          const prefix = `beam-double-${isLeft ? 'l' : 'r'}-lvl${stepIndex}`;

          buildSideWingFrame({
            idPrefix: prefix,
            isLeft,
            xOuter,
            xInner,
            zFront,
            zRear,
            beamY
          }).forEach(addTube);

          // Спаренные диагонали 204 мм вдоль 45° линии чистового стыка ступеней
          buildCornerDiagonals({
            idPrefix: `${prefix}-diag`,
            isLeft,
            xOuter,
            xInner,
            zFront,
            zRear,
            beamY
          }).forEach(addTube);

        });

        // Поперечины фронтальной части с отступом 100 мм от углов
        const joistFromX = xInnerLeft + CORNER_CONFIG.MIN_CORNER_JOIST_OFFSET_MM;
        const joistToX = xInnerRight - CORNER_CONFIG.MIN_CORNER_JOIST_OFFSET_MM;
        if (joistToX - joistFromX > T) {
          buildXJoistRow({
            idPrefix: `joist-double-lvl${stepIndex}`,
            fromX: joistFromX,
            toX: joistToX,
            zFront,
            zRear,
            beamY,
            includeStartJoist: true,
            includeEndJoist: true
          }).forEach(addTube);
        }
      }
    }

    // Опоры: общая сетка независимо от поперечин. Ряды на осях передних балок ярусов и у стены,
    // колонки на крыльях через модуль яруса, в середине равномерно с шагом не больше предела
    const rowsZ: number[] = [T / 2];
    const wingColumns: number[] = [];
    for (let stepIndex = 1; stepIndex <= stepCount; stepIndex++) {
      const { zFront } = calculateTierZBounds(stepIndex, stepCount, STEP_FRAME_MODULE_DEPTH_MM);
      const expansion = (stepCount - stepIndex) * STEP_FRAME_MODULE_DEPTH_MM;
      rowsZ.push(zFront - T / 2);
      wingColumns.push(-halfTopWidth - expansion + T / 2, halfTopWidth + expansion - T / 2);
    }
    const landingLeft = -halfTopWidth + T / 2;
    const landingRight = halfTopWidth - T / 2;
    buildPostGrid(
      tubes,
      [...wingColumns, ...distributeInteriorColumns(landingLeft, landingRight)],
      rowsZ
    ).forEach(addTube);

    return { tubes, totalLengthMm };
  }
}
