import { OrderStatus } from 'generated/prisma';

export interface OrderWithProducts {
  OrderItem: {
    name: string;
    productId: number;
    quantity: number;
    price: number;
  }[];
  id: string;
  totalAmount: number;
  totalItems: number;
  status: OrderStatus;
  paid: boolean;
  paidAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}
