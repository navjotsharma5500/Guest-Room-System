import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { getEventStatus as eventStatus } from './PublicEventCalendar';
import PublicVenueCalendar, { getEventStatus as venueStatus, resolveRoomId, normalizeEvent } from './PublicVenueCalendar';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/event-calendar' }) }), { virtual: true });
jest.mock('socket.io-client', () => ({ io: () => ({ on: jest.fn(), disconnect: jest.fn() }) }));
jest.mock('framer-motion', () => {
 const React = require('react');
 const make = tag => React.forwardRef(({ initial, animate, exit, transition, whileHover, whileTap, ...props }, ref) => React.createElement(tag, { ...props, ref }));
 return { motion: { div: make('div'), article: make('article') }, AnimatePresence: ({ children }) => children, useReducedMotion: () => true };
});
const atIST = (date, minutes) => new Date(`${date}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00+05:30`);
const booking = { _id: 'workshop', eventName: 'WORKSHOP', eventDate: '2026-09-11', eventEndDate: '2026-09-11', eventTime: '11:00 AM', checkOutTime: '1:00 PM', eventHall: { roomNo: 'C-Hall', hall: 'Auditorium / Halls' } };
test.each([
 ['2026-09-11', 659, 'upcoming'], ['2026-09-11', 720, 'live'],
 ['2026-09-11', 780, 'live'], ['2026-09-11', 781, 'completed'],
 ['2026-09-11', 1411, 'completed'], ['2026-09-12', 720, 'completed'],
 ['2026-09-10', 720, 'upcoming'],
])('both calendars at %s minute %s => %s', (date, minutes, expected) => {
 expect(eventStatus(booking, atIST(date, minutes))).toBe(expected);
 expect(venueStatus(normalizeEvent(booking), atIST(date, minutes))).toBe(expected);
});
test.each([
 ['2026-09-11', 600, 'upcoming'], ['2026-09-11', 1400, 'active'],
 ['2026-09-12', 720, 'live'], ['2026-09-12', 1400, 'active'],
 ['2026-09-13', 600, 'upcoming'], ['2026-09-13', 781, 'completed'],
])('multi-day %s minute %s => %s', (date, minutes, expected) => {
 const event = { ...booking, eventEndDate: '2026-09-13' };
 expect(eventStatus(event, atIST(date, minutes))).toBe(expected);
 expect(venueStatus(normalizeEvent(event), atIST(date, minutes))).toBe(expected);
});
test.each(['C-Hall', 'C Hall', 'CHall', 'c-hall', 'c hall'])('%s resolves with and without parent', room => {
 expect(resolveRoomId(room)).toBe('c-hall');
 expect(resolveRoomId(room, 'Auditorium / Halls')).toBe('c-hall');
 expect(normalizeEvent({ ...booking, eventHall: { roomNo: room, hall: 'Auditorium / Halls' } }).groupId).toBe('auditoriums');
});
test.each([
 ['Main Auditorium', 'main-auditorium'], ['TAN Auditorium', 'tan-auditorium'],
 ["Dean's Auditorium", 'deans-auditorium'], ['LT-101', 'lt'], ['LP-101', 'lp'],
 ['CR-1', 'cr'], ['GR-1', 'gr'], ['T-105', 'tan-rooms'], ['E Block', 'e-block'],
 ['F Block', 'f-block'], ['G Block', 'g-block'], ['Activity Room', 'activity-rooms'],
 ['Activity Space', 'activity-space'], ['OAT', 'open-spaces'],
])('%s keeps mapping %s', (room, expected) => expect(resolveRoomId(room, 'Parent section')).toBe(expected));
test('missing venue is safe', () => expect(normalizeEvent({}).roomId).toBeNull());
test('C-Hall counts, selection, details, deduplication and minute refresh', async () => {
 jest.useFakeTimers();
 jest.setSystemTime(new Date('2026-09-11T13:00:00+05:30'));
 global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ events: [booking] }) }));
 const { container, unmount } = render(<PublicVenueCalendar />);
 await waitFor(() => expect(screen.getAllByText('WORKSHOP').length).toBeGreaterThan(0));
 fireEvent.click(screen.getByRole('button', { name: /Auditorium \/ Halls/ }));
 const cHall = screen.getByRole('button', { name: /C-Hall/ });
 expect(cHall.textContent).toMatch(/1/);
 expect(screen.getByRole('button', { name: /Auditorium \/ Halls/ }).textContent).toMatch(/1/);
 fireEvent.click(cHall);
 // Desktop and mobile each render one card from the same deduplicated pool.
 expect(screen.getByRole('button', { name: /All Venues/ }).textContent).toMatch(/1/);
 expect(screen.getAllByText('WORKSHOP')).toHaveLength(2);
 expect(screen.getAllByText('Live')[0]).toBeTruthy();
 const fetchCount = global.fetch.mock.calls.length;
 act(() => jest.advanceTimersByTime(60000));
 expect(global.fetch).toHaveBeenCalledTimes(fetchCount);
 expect(screen.getAllByText('Done')[0]).toBeTruthy();
 fireEvent.click(screen.getAllByText('WORKSHOP')[0]);
 expect(screen.getAllByText('WORKSHOP')).toHaveLength(3);
 expect(container.textContent).toContain('1:00 PM');
 unmount(); jest.useRealTimers();
});

test('both calendars export the identical shared helper', () => { expect(eventStatus).toBe(venueStatus); expect(eventStatus).toBe(require('../utils/eventStatus').getEventStatus); });
