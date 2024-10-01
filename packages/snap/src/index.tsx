import type { OnNameLookupHandler } from "@metamask/snaps-sdk"

export const onNameLookup: OnNameLookupHandler = async (request) => {
  const { chainId, address, domain } = request;

  if (address) {
    const shortAddress = address.substring(2, 5);
    const chainIdDecimal = parseInt(chainId.split(':')[1], 10);
    const resolvedDomain = `${shortAddress}.${chainIdDecimal}.test.domain`;
    return { resolvedDomains: [{ resolvedDomain, protocol: 'test protocol' }] };
  }

  if (domain) {

    if(domain.startsWith('farcaster:') || domain.startsWith('fc:')) { 
      const fcName = domain.split(':')[1]; 
      if(!fcName) { return null; }

      const options = {
        method: 'GET',
        headers: {accept: 'application/json', api_key: 'NEYNAR_API_DOCS'}
      };

      const response = await fetch(`https://api.neynar.com/v2/farcaster/user/search?q=${fcName}&limit=1`, options); 
      const json = await response.json(); 

      if(json.result && json.result.users && json.result.users.length) { 
        const foundUser = json.result.users[0]; 
        if(foundUser.username == fcName) { 
          if(foundUser.verified_addresses && foundUser.verified_addresses.eth_addresses && 
            foundUser.verified_addresses.eth_addresses.length) { 
            const foundAddress = foundUser.verified_addresses.eth_addresses[0]; 
            console.log(foundAddress); 
            return { 
              resolvedAddresses: [
                { resolvedAddress: foundAddress, protocol: 'Farcaster', domainName: fcName },
              ]
            }
          }
        }
      }

    }
    else { 

      const resolvedAddress = '0xc0ffee254729296a45a3885639AC7E10F9d54979';
      return {
        resolvedAddresses: [
          { resolvedAddress, protocol: 'test protocol', domainName: domain },
        ],
      };
    
    }
  }

  return null;
};