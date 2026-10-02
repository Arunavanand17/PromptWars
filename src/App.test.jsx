/**
 * @fileoverview Component render & accessibility tests for MedAlert.
 *
 * Uses React Testing Library to verify that key UI elements render,
 * are accessible, and respond to user interaction correctly.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

// ──────────────────────────────────────────────
//  App — Smoke & Structure Tests
// ──────────────────────────────────────────────

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('MedAlert')).toBeInTheDocument();
  });

  it('renders the hidden h1 for screen readers', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('sr-only');
  });

  it('renders four stat cards', () => {
    render(<App />);
    expect(screen.getByText('ICU Beds Available')).toBeInTheDocument();
    expect(screen.getByText('Ventilators Available')).toBeInTheDocument();
    expect(screen.getByText('Oxygen Cylinders')).toBeInTheDocument();
    expect(screen.getByText('General Beds Available')).toBeInTheDocument();
  });

  it('renders the skip-nav link', () => {
    render(<App />);
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });
});

// ──────────────────────────────────────────────
//  Navigation
// ──────────────────────────────────────────────

describe('Navigation', () => {
  it('renders all navigation tabs', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /admin/i })).toBeInTheDocument();
  });

  it('switches to Analytics tab on click', async () => {
    render(<App />);
    const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
    await userEvent.click(analyticsTab);
    expect(screen.getByText('City-Wide Analytics')).toBeInTheDocument();
  });

  it('switches to Admin tab on click', async () => {
    render(<App />);
    const adminTab = screen.getByRole('tab', { name: /admin/i });
    await userEvent.click(adminTab);
    expect(screen.getByText('Hospital Admin Panel')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
//  Hospital Cards
// ──────────────────────────────────────────────

describe('Hospital Cards', () => {
  it('renders hospital cards on dashboard', () => {
    render(<App />);
    expect(screen.getByText('AIIMS New Delhi')).toBeInTheDocument();
    expect(screen.getByText('Safdarjung Hospital')).toBeInTheDocument();
  });

  it('hospital cards are keyboard navigable', () => {
    render(<App />);
    const card = screen.getByText('AIIMS New Delhi').closest('[role="button"]');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  it('hospital cards show "Updated" time', () => {
    render(<App />);
    const updatedElements = screen.getAllByText(/Updated \d+[smh] ago/);
    expect(updatedElements.length).toBeGreaterThan(0);
  });

  it('shows call and directions buttons for each hospital', () => {
    render(<App />);
    const callBtns = screen.getAllByTitle('Call Hospital');
    const dirBtns = screen.getAllByTitle('Get Directions');
    expect(callBtns.length).toBeGreaterThan(0);
    expect(dirBtns.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────
//  Search & Filter
// ──────────────────────────────────────────────

describe('Search & Filter', () => {
  it('renders the search input', () => {
    render(<App />);
    const searchInput = screen.getByPlaceholderText('Search hospitals, specialties...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'search');
  });

  it('filters hospitals on search', async () => {
    render(<App />);
    const searchInput = screen.getByPlaceholderText('Search hospitals, specialties...');
    await userEvent.type(searchInput, 'AIIMS');
    expect(screen.getByText('AIIMS New Delhi')).toBeInTheDocument();
    expect(screen.queryByText('Safdarjung Hospital')).not.toBeInTheDocument();
  });

  it('renders filter chips as toggle buttons', () => {
    render(<App />);
    const filterBtns = screen.getAllByRole('button').filter((btn) =>
      btn.classList.contains('filter-chip'),
    );
    expect(filterBtns.length).toBeGreaterThanOrEqual(6);
  });

  it('shows "No hospitals match" for invalid search', async () => {
    render(<App />);
    const searchInput = screen.getByPlaceholderText('Search hospitals, specialties...');
    await userEvent.type(searchInput, 'xyznonexistent');
    expect(screen.getByText('No hospitals match your search.')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
//  Emergency Modal
// ──────────────────────────────────────────────

describe('Emergency Modal', () => {
  it('opens and shows emergency contacts', async () => {
    render(<App />);
    const emergencyBtn = screen.getByLabelText('Open emergency contacts');
    await userEvent.click(emergencyBtn);
    expect(screen.getByText('Emergency Helpline')).toBeInTheDocument();
    expect(screen.getByText('112')).toBeInTheDocument();
    expect(screen.getByText('102')).toBeInTheDocument();
    expect(screen.getByText('108')).toBeInTheDocument();
    expect(screen.getByText('1078')).toBeInTheDocument();
  });

  it('has correct ARIA attributes for dialog', async () => {
    render(<App />);
    await userEvent.click(screen.getByLabelText('Open emergency contacts'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'emergency-modal-title');
  });

  it('closes on Escape key', async () => {
    render(<App />);
    await userEvent.click(screen.getByLabelText('Open emergency contacts'));
    expect(screen.getByText('Emergency Helpline')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Emergency Helpline')).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
//  Admin Panel Validation
// ──────────────────────────────────────────────

describe('Admin Panel', () => {
  it('renders admin form with labels and inputs', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: /admin/i }));
    expect(screen.getByLabelText(/Select Hospital/i)).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /ICU Beds Available/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Ventilators Available/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Oxygen Cylinders Available/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /General Beds Available/i })).toBeInTheDocument();
  });

  it('shows validation error for negative input', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: /admin/i }));

    const icuInput = screen.getByRole('spinbutton', { name: /ICU Beds Available/i });
    await userEvent.clear(icuInput);
    await userEvent.type(icuInput, '-5');

    const submitBtn = screen.getByText('Update & Broadcast');
    await userEvent.click(submitBtn);

    expect(screen.getByText('Cannot be negative.')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
//  Capacity Bars (Accessibility)
// ──────────────────────────────────────────────

describe('Capacity Bars', () => {
  it('capacity bars have progressbar role', () => {
    render(<App />);
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBe(4);
    progressBars.forEach((bar) => {
      expect(bar).toHaveAttribute('aria-valuenow');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
    });
  });
});
