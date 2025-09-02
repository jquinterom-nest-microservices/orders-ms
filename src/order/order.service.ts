import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from 'generated/prisma';
import { RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, OrderPaginationDto } from './dto';

@Injectable()
export class OrderService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(OrderService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database successfully');
  }

  async create(createOrderDto: CreateOrderDto) {
    await this.order.create({
      data: createOrderDto,
    });

    return createOrderDto;
  }

  async findAll(paginationDto: OrderPaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;

    const total = await this.order.count({
      where: { status: paginationDto.status },
    });

    const lastPage = Math.ceil(total / limit);

    const data = await this.order.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: {
        status: paginationDto.status,
      },
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage,
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findUnique({
      where: {
        id,
      },
    });

    if (!order) {
      throw new RpcException({
        message: `Product with id #${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return order;
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);

    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }
}
