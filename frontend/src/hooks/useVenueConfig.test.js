import { act, renderHook, waitFor } from "@testing-library/react";
import useVenueConfig from "./useVenueConfig";

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

const response = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

const tabsWithRoom = (name) => [{
  id: "tab",
  label: "Tab",
  enabled: true,
  sections: [{
    id: "section",
    label: "Section",
    enabled: true,
    rooms: [{ id: name.toLowerCase(), name, enabled: true }],
  }],
}];

afterEach(() => {
  jest.restoreAllMocks();
});

test("an older initial config response cannot overwrite a newer mutation", async () => {
  const initial = deferred();
  global.fetch = jest.fn()
    .mockImplementationOnce(() => initial.promise)
    .mockResolvedValueOnce(response({ mainTabs: tabsWithRoom("New Room") }));

  const { result } = renderHook(() => useVenueConfig());

  await act(async () => {
    await result.current.addRoom("section", "New Room");
  });
  expect(result.current.venueConfig[0].sections[0].rooms[0].name).toBe("New Room");

  await act(async () => {
    initial.resolve(response({ mainTabs: tabsWithRoom("Old Room") }));
    await initial.promise;
  });

  expect(result.current.venueConfig[0].sections[0].rooms[0].name).toBe("New Room");
  expect(result.current.source).toBe("dynamic");
});

test("a config API failure exposes fallback state without retrying", async () => {
  global.fetch = jest.fn().mockResolvedValue(response({}, false, 503));
  const { result } = renderHook(() => useVenueConfig());

  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.source).toBe("fallback");
  expect(result.current.isDynamic).toBe(false);
  expect(result.current.error).toMatch(/503/);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
