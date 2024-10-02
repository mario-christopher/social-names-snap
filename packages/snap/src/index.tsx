import type { OnNameLookupHandler } from '@metamask/snaps-sdk';

export const onNameLookup: OnNameLookupHandler = async (request) => {
  const { chainId, address, domain } = request;

  if (address) {
    // TO DO: implement reverse resolution!
    const shortAddress = address.substring(2, 5);
    const chainIdDecimal = parseInt(`${chainId}`.split(':')[1], 10);
    const resolvedDomain = `${shortAddress}.${chainIdDecimal}.test.domain`;
    return { resolvedDomains: [{ resolvedDomain, protocol: 'test protocol' }] };
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
          api_key: atob('QTQyQkM1OTUtRDI3OS00NkVELUI0RjAtQzAxN0ZEOTM0RjlB'),
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
            console.log(foundAddress);
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
