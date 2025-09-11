/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from 'generated/prisma';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, OrderPaginationDto } from './dto';
import { NATS_SERVICE } from 'src/config';
import { catchError, firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/orderWithProducts';

interface ProductFromDb {
  id: number;
  name: string;
  price: number;
}

@Injectable()
export class OrderService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject(NATS_SERVICE)
    private readonly client: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database successfully');
  }

  async create(createOrderDto: CreateOrderDto) {
    const productIds = createOrderDto.items.map((item) => item.productId);

    try {
      const products: ProductFromDb[] = await firstValueFrom(
        this.client.send({ cmd: 'validate_products' }, productIds).pipe(
          catchError((error) => {
            throw new RpcException(error as string | object);
          }),
        ),
      );

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const product = products.find(
          (product) => product.id === orderItem.productId,
        );
        const price = product?.price ?? 0;
        return price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce(
        (acc, orderItem) => acc + orderItem.quantity,
        0,
      );

      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                productId: orderItem.productId,
                quantity: orderItem.quantity,
                price:
                  products.find((product) => product.id === orderItem.productId)
                    ?.price ?? 0,
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name:
            products.find((product) => product.id === orderItem.productId)
              ?.name ?? '',
        })),
      };
    } catch (error) {
      throw new RpcException(error as object | string);
    }
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
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({
        message: `Product with id #${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });
    }

    const productIds = order.OrderItem.map((orderItem) => orderItem.productId);

    const products: ProductFromDb[] = await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, productIds),
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        name:
          products.find((product) => product.id === orderItem.productId)
            ?.name ?? '',
      })),
    };
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

  async createPaymentSession(order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        orderId: order.id,
        currency: 'usd',
        items: order.OrderItem.map((orderItem) => ({
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
        })),
      }),
    );

    return paymentSession;
  }
}
