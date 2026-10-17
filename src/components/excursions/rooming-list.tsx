import { ROOM_TYPE_LABEL } from "@/lib/format/labels";
import type { RoomView } from "@/lib/services/views";

export function RoomingList({ rooms }: { rooms: RoomView[] }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-3xl leading-none">Quartos</h2>
      <ul className="mt-4">
        {rooms.map((room) => (
          <li
            key={room.id}
            className="border-b border-line py-4 dark:border-line-dark"
          >
            <p>
              {room.label} · {ROOM_TYPE_LABEL[room.roomType]}
            </p>
            <p className="mt-1 text-sm text-muted dark:text-faint">
              {room.passengerNames.join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
