import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from 'generated/prisma';
import { PaginationDto } from 'src/common';
import { OrderStatusList } from '../enum/orders.enum';

export class OrderPaginationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatusList, {
    message: `Posible status values are: ${OrderStatusList.join(', ')}`,
  })
  status: OrderStatus;
}
