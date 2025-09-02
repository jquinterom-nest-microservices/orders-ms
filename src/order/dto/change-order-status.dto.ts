import { IsEnum, IsUUID } from 'class-validator';
import { OrderStatus } from 'generated/prisma';
import { OrderStatusList } from '../enum/orders.enum';

export class ChangeOrderStatusDto {
  @IsUUID()
  id: string;

  @IsEnum(OrderStatusList, {
    message: `Posible status values are: ${OrderStatusList.join(', ')}`,
  })
  status: OrderStatus;
}
