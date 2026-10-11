import { MarketplaceThread } from '../../components/marketplace-thread';

// Trade-side conversation route. Shares one implementation with the
// customer route (/customer/thread/[id]) via <MarketplaceThread/>.
export default function MarketplaceThreadScreen() {
  return <MarketplaceThread />;
}
