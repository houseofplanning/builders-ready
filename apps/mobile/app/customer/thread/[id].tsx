import { MarketplaceThread } from '../../../components/marketplace-thread';

// Customer-side conversation route. Lives inside the /customer group so the
// AuthGate (which bounces no-tenant customers out of other groups) leaves
// them here. Shares its implementation with the trade route.
export default function CustomerThreadScreen() {
  return <MarketplaceThread />;
}
