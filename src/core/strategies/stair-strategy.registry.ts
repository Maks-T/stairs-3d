import type { StairType } from '@/constants/stairs-config';
import type { StairLayoutStrategy } from './stair-strategy.interface';
import { StraightStairStrategy } from './straight.strategy';
import { CornerSingleStairStrategy } from './corner-single.strategy';
import { CornerDoubleStairStrategy } from './corner-double.strategy';

class StairStrategyRegistry {
  private readonly strategies = new Map<StairType, StairLayoutStrategy>();

  constructor() {
    this.register('straight', new StraightStairStrategy());
    this.register('corner-left', new CornerSingleStairStrategy('left'));
    this.register('corner-right', new CornerSingleStairStrategy('right'));
    this.register('corner-double', new CornerDoubleStairStrategy());
  }

  register(type: StairType, strategy: StairLayoutStrategy): void {
    this.strategies.set(type, strategy);
  }

  get(type: StairType): StairLayoutStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      return this.strategies.get('straight') ?? new StraightStairStrategy();
    }
    return strategy;
  }
}

export const stairStrategyRegistry = new StairStrategyRegistry();