import { act, renderHook, waitFor } from "@testing-library/react";
import useVenueDataPolling from "./useVenueDataPolling";

jest.mock("../socket", () => ({
  __esModule: true,
  default: { connected: false, on: jest.fn(), off: jest.fn() },
}));

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

const response = (body) => ({ ok: true, status: 200, json: async () => body });
const config = (roomName) => [{
  id: "tab",
  label: "Tab",
  enabled: true,
  sections: [{
    id: "section",
    label: "Section",
    enabled: true,
    rooms: [{ id: roomName.toLowerCase(), name: roomName, enabled: true }],
  }],
}];

afterEach(() => {
  jest.restoreAllMocks();
});

test("a newer config immediately wins over an in-flight booking request", async () => {
  const first = deferred();
  const second = deferred();
  global.fetch = jest.fn()
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => second.promise);

  const { result, rerender } = renderHook(
    ({ venueConfig }) => useVenueDataPolling({}, venueConfig),
    { initialProps: { venueConfig: config("Room A") } }
  );

  rerender({ venueConfig: config("Room B") });
  expect(result.current.venueData.Section.rooms).toEqual([
    { roomNo: "Room B", bookings: [] },
  ]);

  await act(async () => {
    first.resolve(response([]));
    await first.promise;
  });
  expect(result.current.venueData.Section.rooms[0].roomNo).toBe("Room B");

  await act(async () => {
    second.resolve(response([]));
    await second.promise;
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.venueData.Section.rooms).toEqual([
    { roomNo: "Room B", bookings: [] },
  ]);
});
