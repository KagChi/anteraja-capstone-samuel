interface ShipmentEmptyStateProps {
  colSpan: number;
}

export function ShipmentEmptyState({ colSpan }: ShipmentEmptyStateProps) {
  return (
    <tr id="delivery-empty">
      <td
        className="px-5 py-10 text-center text-body-sm text-on-surface-variant"
        colSpan={colSpan}
      >
        Tidak ada pengiriman yang cocok dengan filter atau pencarian.
      </td>
    </tr>
  );
}
