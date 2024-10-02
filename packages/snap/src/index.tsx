import type {
  DomainResolution,
  OnNameLookupHandler,
} from '@metamask/snaps-sdk';

export const onNameLookup: OnNameLookupHandler = async (request) => {
  const { address, domain } = request;

  if (address) {
    const resolvedDomains: DomainResolution[] = [];

    // get owned handles on Lens Protocol
    const optionsLens = {
      method: 'POST',
      headers: {
        'User-Agent': 'spectaql',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query {
          ownedHandles(request: { for: "${address}" }) {
            items {
              fullHandle
              ownedBy
              linkedTo {
                contract {
                  address
                  chainId
                }
              }
              suggestedFormatted {
                full
                localName
              }
            }
            pageInfo {
              next
              prev
            }
          }
        }`,
      }),
    };

    const fetchLens = fetch('https://api-v2.lens.dev/', optionsLens).then(
      async (response) => response.json(),
    );

    const optionsNeynar = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        api_key: atob('QTQyQkM1OTUtRDI3OS00NkVELUI0RjAtQzAxN0ZEOTM0RjlB'), // eslint-disable-line @typescript-eslint/naming-convention
      },
    };

    const fetchNeynar = fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      optionsNeynar,
    ).then(async (response) => response.json());

    try {
      const results = await Promise.allSettled([fetchLens, fetchNeynar]);

      // Process the results
      const jsonLens =
        results[0].status === 'fulfilled' ? results[0].value : null;
      const jsonNeynar =
        results[1].status === 'fulfilled' ? results[1].value : null;

      if (jsonLens.data?.ownedHandles?.items?.length) {
        // we have at least one handle to return
        jsonLens.data.ownedHandles.items.forEach((item: any) => {
          resolvedDomains.push({
            resolvedDomain: item.suggestedFormatted.full,
            protocol: 'Lens Protocol',
          });
        });
      }

      if (jsonNeynar[address]) {
        jsonNeynar[address].forEach((item: any) => {
          resolvedDomains.push({
            resolvedDomain: `FC: ${item.username}`, // eslint-disable-line @typescript-eslint/restrict-template-expressions
            protocol: 'Farcaster',
          });
        });
      }

      if (resolvedDomains.length) {
        return { resolvedDomains };
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  }

  if (domain) {
    if (domain.startsWith('farcaster:') || domain.startsWith('fc:')) {
      const fcName = domain.split(':')[1];
      if (!fcName) {
        return null;
      }

      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          api_key: atob('QTQyQkM1OTUtRDI3OS00NkVELUI0RjAtQzAxN0ZEOTM0RjlB'), // eslint-disable-line @typescript-eslint/naming-convention
        },
      };

      const response = await fetch(
        `https://api.neynar.com/v2/farcaster/user/search?q=${fcName}&limit=1`,
        options,
      );
      const json = await response.json();

      if (json.result?.users?.length) {
        const foundUser = json.result.users[0];
        if (foundUser.username === fcName) {
          if (foundUser.verified_addresses?.eth_addresses?.length) {
            const foundAddress = foundUser.verified_addresses.eth_addresses[0];
            return {
              resolvedAddresses: [
                {
                  resolvedAddress: foundAddress,
                  protocol: 'Farcaster',
                  domainName: fcName,
                },
              ],
            };
          }
        }
      }
    } else if (domain.endsWith('.lens')) {
      const lensHandle = domain.replace('.lens', '');

      const options = {
        method: 'POST',
        headers: {
          'User-Agent': 'spectaql',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `query {
            handleToAddress(request: { handle: "lens/${lensHandle}" })
          }`,
        }),
      };

      const response = await fetch('https://api-v2.lens.dev/', options);
      const json = await response.json();

      if (json.data?.handleToAddress) {
        // found a match
        const resolvedAddress = json.data.handleToAddress;
        return {
          resolvedAddresses: [
            { resolvedAddress, protocol: 'Lens', domainName: domain },
          ],
        };
      }
    }
  }

  return null;
};
