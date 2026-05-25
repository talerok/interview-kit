export const environment = {
  production: false,
  cloud: {
    dropbox: {
      clientId: 'fy5plm6nikxmjxv',
      redirectUri: new URL('oauth/dropbox', document.baseURI).toString(),
    },
  },
};
