/** TransferPlay — 与 docs/schemas/transfer-play.schema.json 对齐 */
export interface TransferPlay {
    hub_city: string;
    anchor_station: string;
    name: string;
    dist_text: string;
    dist_km?: number;
    suggest_hours: number;
    suggest_text: string;
    min_buffer_hours: number;
    back_ok_note: string;
}
