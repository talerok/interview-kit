// One workspace per (provider, account) pair. The `local` account is the
// always-available offline workspace; cloud-backed accounts are added on
// OAuth success and identified by `${kind}:${email}` so reconnecting the
// same Dropbox account doesn't fork a new workspace.

export type AccountKind = 'local' | 'dropbox';

export type AccountId = string;

export interface Account {
  readonly id: AccountId;
  readonly kind: AccountKind;
  readonly label: string;
  readonly email: string | null;
  readonly accessToken: string | null;
  readonly refreshToken: string | null;
  readonly tokenExpiresAt: string | null;
}

export interface AccountsRegistry {
  readonly activeId: AccountId;
  readonly accounts: readonly Account[];
}

export const LOCAL_ACCOUNT_ID: AccountId = 'local';

export const LOCAL_ACCOUNT: Account = {
  id: LOCAL_ACCOUNT_ID,
  kind: 'local',
  label: 'Локально',
  email: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
};

export const initialRegistry = (): AccountsRegistry => ({
  activeId: LOCAL_ACCOUNT_ID,
  accounts: [LOCAL_ACCOUNT],
});

export const accountIdFor = (kind: Exclude<AccountKind, 'local'>, email: string): AccountId =>
  `${kind}:${email.toLowerCase().trim()}`;

/** IDB name for the data workspace owned by an account. */
export const dbNameFor = (accountId: AccountId): string =>
  accountId === LOCAL_ACCOUNT_ID ? 'interviewkit' : `interviewkit:${accountId}`;
