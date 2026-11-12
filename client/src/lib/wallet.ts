import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import {
  WalletConnectModule,
  WalletConnectTargetChain,
} from "@creit.tech/stellar-wallets-kit/modules/wallet-connect";

let ready = false;
let wc: WalletConnectModule | null = null;

export function initWallet() {
  if (ready) return;
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  if (projectId) {
    wc = new WalletConnectModule({
      projectId,
      allowedChains: [WalletConnectTargetChain.TESTNET],
      metadata: {
        name: "Pact",
        description: "Support creators directly",
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });
  }
  StellarWalletsKit.init({
    network: Networks.TESTNET,
    modules: [...defaultModules(), ...(wc ? [wc] : [])],
  });
  ready = true;
}

/** Deep link into the wallet the fan connected with, if it reported one. */
export async function openWallet() {
  try {
    const sessions = await wc?.getSessions();
    const redirect = sessions?.at(-1)?.peer.metadata.redirect;
    const link = redirect?.native || redirect?.universal;
    if (link) window.location.href = link;
  } catch {
    /* nothing to open; the UI tells the fan to switch apps manually */
  }
}
