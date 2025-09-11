/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, ParseUUIDPipe } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeOrderStatusDto, OrderPaginationDto, PaidOrderDto } from './dto';
import { OrderWithProducts } from './interfaces/orderWithProducts';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {
    console.log('[INIT] OrdersController loaded');
  }

  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order: OrderWithProducts =
      await this.orderService.create(createOrderDto);

    const paymentSession = await this.orderService.createPaymentSession(order);

    return { order, paymentSession };
  }

  @MessagePattern('findAllOrder')
  findAll(@Payload() paginationDto: OrderPaginationDto) {
    return this.orderService.findAll(paginationDto);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.orderService.findOne(id);
  }

  @MessagePattern('changeOrderStatus')
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
    return this.orderService.changeOrderStatus(changeOrderStatusDto);
  }

  @EventPattern('payment.succeeded')
  paidOrder(@Payload() paidOrderDto: PaidOrderDto) {
    return this.orderService.paidOrder(paidOrderDto);
  }
}
