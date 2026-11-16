import type { Offer, WishKind } from '../../../types/domain';


export interface OfferQuery {
  query: string;
  kind: WishKind;
}


export interface OfferProvider {

  readonly name: string;

  readonly supportedKinds: readonly WishKind[];
  findOffers(query: OfferQuery): Promise<Offer[]>;
}
