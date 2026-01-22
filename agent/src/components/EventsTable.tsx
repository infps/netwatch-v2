type Event = {
  type: "mouse" | "key";
  x?: number;
  y?: number;
  movements?: number;
  keystrokes?: number;
  recentKeys?: number[];
  timestamp: number;
};

type EventsTableProps = {
  events: Event[];
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  const s = date.getSeconds().toString().padStart(2, "0");
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${h}:${m}:${s}:${ms}`;
};

const EventsTable = ({ events }: EventsTableProps) => {
  const recentEvents = events.slice(-10).reverse();

  return (
    <div className="bg-white rounded-lg shadow p-4 mt-6">
      <p className="text-lg font-semibold mb-4">Recent Events</p>

      <div className="overflow-auto max-h-64">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200">
            <tr className="text-left text-neutral-500">
              <th className="pb-2 font-medium">Time</th>
              <th className="pb-2 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-4 text-center text-neutral-400">
                  No events yet
                </td>
              </tr>
            ) : (
              recentEvents.map((event, i) => (
                <tr key={i} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2 text-neutral-500 font-mono text-xs">
                    {formatTime(event.timestamp)}
                  </td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        event.type === "mouse"
                          ? "bg-neutral-100 text-neutral-700"
                          : "bg-black text-white"
                      }`}
                    >
                      {event.type === "mouse" ? "Mouse" : "Key"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventsTable;
