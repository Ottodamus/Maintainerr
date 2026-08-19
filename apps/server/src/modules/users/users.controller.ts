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
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { toUserDto } from './user.mapper';
import { UsersService } from './users.service';

// JwtAuthGuard already runs globally (APP_GUARD in AppModule) - only the
// role restriction needs to be declared here.
@Controller('api/users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.usersService.findById(currentUser.id);
    return user ? toUserDto(user) : null;
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return (await this.usersService.findAll()).map(toUserDto);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async invite(
    @Body(new ZodValidationPipe(inviteUserSchema)) payload: InviteUserDto,
  ) {
    return toUserDto(await this.usersService.invite(payload));
  }

  @Patch('/:id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', new ParseIntPipe()) id: number,
    @Body(new ZodValidationPipe(updateUserSchema)) payload: UpdateUserDto,
  ) {
    return toUserDto(await this.usersService.updateUser(id, payload));
  }
}
