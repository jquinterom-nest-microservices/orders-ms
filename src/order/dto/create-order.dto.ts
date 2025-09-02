import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { OrderStatusList } from '../enum/orders.enum';
import { OrderStatus } from 'generated/prisma';

export class CreateOrderDto {
  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @IsNumber()
  @IsPositive()
  totalItems: number;

  @IsEnum(OrderStatusList, {
    message: `Posible status values are: ${OrderStatusList.join(', ')}`,
  })
  @IsOptional()
  status: OrderStatus = OrderStatus.PENDING;

  @IsBoolean()
  @IsOptional()
  paid: boolean = false;
}
