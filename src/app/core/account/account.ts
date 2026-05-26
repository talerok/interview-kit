// One workspace per (provider, account) pair. The `local` account is the
// always-available offline workspace; cloud-backed accounts are added on
// OAuth success and identified by `${kind}:${email}` so reconnecting the
// same Dropbox account doesn't fork a new workspace.

export const LOCAL_KIND = 'local' as const;
export type LocalKind = typeof LOCAL_KIND;

/** Every cloud provider's account-kind discriminator. Extend as providers grow. */
export type CloudAccountKind = 'dropbox';

export type AccountKind = LocalKind | CloudAccountKind;

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

export const LOCAL_ACCOUNT_ID: AccountId = LOCAL_KIND;

export const LOCAL_ACCOUNT: Account = {
  id: LOCAL_ACCOUNT_ID,
  kind: LOCAL_KIND,
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

export const accountIdFor = (kind: CloudAccountKind, email: string): AccountId =>
  `${kind}:${email.toLowerCase().trim()}`;

export const isLocalAccount = (a: Account): boolean => a.kind === LOCAL_KIND;

export const isCloudAccount = (
  a: Account,
): a is Account & { readonly kind: CloudAccountKind } => a.kind !== LOCAL_KIND;

/** IDB name for the data workspace owned by an account. */
export const dbNameFor = (accountId: AccountId): string =>
  accountId === LOCAL_ACCOUNT_ID ? 'interviewkit' : `interviewkit:${accountId}`;
