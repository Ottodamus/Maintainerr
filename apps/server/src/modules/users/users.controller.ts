import {
  InviteUserDto,
  inviteUserSchema,
  UpdateUserDto,
  updateUserSchema,
  UserRole,
} from '@maintainerr/contracts';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.findById(currentUser.id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async invite(
    @Body(new ZodValidationPipe(inviteUserSchema)) payload: InviteUserDto,
  ) {
    return this.usersService.invite(payload);
  }

  @Patch('/:id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', new ParseIntPipe()) id: number,
    @Body(new ZodValidationPipe(updateUserSchema)) payload: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, payload);
  }
}
