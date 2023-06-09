import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schemas';
import { Model } from 'mongoose';
import { SearchProductsRequestDTO } from './dtos';
import { RpcException } from '@nestjs/microservices';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
    constructor(
        @InjectModel(Product.name) private productModel: Model<Product>, // TODO: remove this
        private readonly productsRepository: ProductsRepository, // TODO: use this instead of productModel
    ) {}

    async getProducts() {
        return this.productsRepository.find({});
    }

    // async create(CreateProductDTO: createProductDto) {
    //     try {
    //         const newProduct = new this.productModel(CreateProductDTO);
    //         return await newProduct.save();
    //     } catch (error) {
    //         throw error;
    //     }
    // }

    // async update(updateProductDto: updateProductDto) {
    //     try {
    //         const updated = this.productsRepository.
    //     } catch (error) {
    //         throw error;
    //     }
    // }

    async searchByName({ searchTerm, page, sortField, sortOrder }: SearchProductsRequestDTO) {
        try {
            const productsFound = await this.productsRepository.searchProducts(
                searchTerm,
                page,
                sortField,
                sortOrder,
            );

            if (productsFound.length === 0) {
                throw new NotFoundException('Not found any product!');
            }

            return { productsFound };
        } catch (error) {
            throw new RpcException(
                new ConflictException('An error occurred while searching for products.'),
            );
        }
    }
}
