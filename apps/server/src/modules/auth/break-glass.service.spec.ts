import { MaintainerrLogger } from '../logging/logs.service';
import { UsersService } from '../users/users.service';
import { BreakGlassService } from './break-glass.service';

describe('BreakGlassService', () => {
  const usersService = {
    upsertBreakGlassAdmin: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;

  const logger = {
    setContext: jest.fn(),
    log: jest.fn(),
  } as unknown as jest.Mocked<MaintainerrLogger>;

  let service: BreakGlassService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.BREAK_GLASS_USERNAME;
    delete process.env.BREAK_GLASS_PASSWORD;
    service = new BreakGlassService(usersService, logger);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does nothing when neither env var is set', async () => {
    await service.onModuleInit();

    expect(usersService.upsertBreakGlassAdmin).not.toHaveBeenCalled();
  });

  it('does nothing when only the username is set', async () => {
    process.env.BREAK_GLASS_USERNAME = 'recovery';

    await service.onModuleInit();

    expect(usersService.upsertBreakGlassAdmin).not.toHaveBeenCalled();
  });

  it('does nothing when only the password is set', async () => {
    process.env.BREAK_GLASS_PASSWORD = 'super-secret';

    await service.onModuleInit();

    expect(usersService.upsertBreakGlassAdmin).not.toHaveBeenCalled();
  });

  it('upserts the break-glass account with a hashed password when both are set', async () => {
    process.env.BREAK_GLASS_USERNAME = ' recovery ';
    process.env.BREAK_GLASS_PASSWORD = 'super-secret';

    await service.onModuleInit();

    expect(usersService.upsertBreakGlassAdmin).toHaveBeenCalledWith(
      'recovery',
      expect.any(String),
    );
    const [, passwordHash] = (usersService.upsertBreakGlassAdmin as jest.Mock)
      .mock.calls[0];
    expect(passwordHash).not.toBe('super-secret');
  });
});
