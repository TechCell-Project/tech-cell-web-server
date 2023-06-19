import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common';

@Schema({ versionKey: false })
export class Otp extends AbstractDocument {
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    otpCode: string;

    @Prop({ default: 0 })
    wrongCount?: number;

    @Prop({ default: Date.now })
    createdAt?: Date;

    @Prop({ default: Date.now, index: 1, expires: process.env.OTP_EXPIRE_TIME_STRING || '5m' })
    updatedAt?: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
