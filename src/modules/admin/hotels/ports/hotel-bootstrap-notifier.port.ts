export interface HotelBootstrapNotifierPort {
  notify(hotelId: string): Promise<void>;
}
