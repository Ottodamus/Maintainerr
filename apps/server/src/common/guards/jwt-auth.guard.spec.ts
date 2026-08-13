import { UserRole } from '@maintainerr/contracts';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SESSION_COOKIE_NAME } from '../../modules/auth/auth.constants';
import { MaintainerrLogger } from '../../modules/logging/logs.service';
import { JwtAuthGuard } from './jwt-auth.guard';

function buildContext(request: {
  cookies: Record<string, string>;
  user?: unknown;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  const logger = {
    setContext: jest.fn(),
    debug: jest.fn(),
  } as unknown as jest.Mocked<MaintainerrLogger>;

  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard(jwtService, logger);
  });

  it('throws UnauthorizedException when no session cookie is present', async () => {
    const context = buildContext({ cookies: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the token fails verification', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('bad signature'));
    const context = buildContext({
      cookies: { [SESSION_COOKIE_NAME]: 'invalid-token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(logger.debug).toHaveBeenCalledWith(expect.any(Error));
  });

  it('attaches the decoded user to the request and returns true on success', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 7,
      role: UserRole.APPROVER,
    });
    const request = { cookies: { [SESSION_COOKIE_NAME]: 'valid-token' } };
    const context = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toEqual(
      expect.objectContaining({
        user: { id: 7, role: UserRole.APPROVER },
      }),
    );
  });
});
