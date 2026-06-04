import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from './ErrorState';

describe('ErrorState', () => {
  describe('auto-classification', () => {
    it('shows network preset for offline error', () => {
      render(<ErrorState error={new Error('network failure')} />);
      expect(screen.getByText('No connection')).toBeInTheDocument();
    });

    it('shows auth preset for 401 error', () => {
      render(<ErrorState error={new Error('401 Unauthorized')} />);
      expect(screen.getByText('Session expired')).toBeInTheDocument();
    });

    it('shows server preset for generic error', () => {
      render(<ErrorState error={new Error('unexpected crash')} />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('defaults to server preset when error is null', () => {
      render(<ErrorState error={null} />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('explicit preset override', () => {
    it('renders empty preset when preset="empty"', () => {
      render(<ErrorState preset="empty" />);
      expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    });

    it('preset takes precedence over error classification', () => {
      render(<ErrorState error={new Error('network down')} preset="auth" />);
      expect(screen.getByText('Session expired')).toBeInTheDocument();
    });
  });

  describe('custom title and body', () => {
    it('renders custom title and body', () => {
      render(<ErrorState title="Custom heading" body="Custom description" />);
      expect(screen.getByText('Custom heading')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });

    it('suppresses raw error.message when title is provided', () => {
      const err = new Error('internal detail');
      render(<ErrorState error={err} title="Safe message" />);
      expect(screen.queryByText('internal detail')).not.toBeInTheDocument();
    });
  });

  describe('retry button', () => {
    it('is not rendered without onRetry', () => {
      render(<ErrorState error={new Error('oops')} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders and fires onRetry', () => {
      const onRetry = vi.fn();
      render(<ErrorState error={new Error('oops')} onRetry={onRetry} />);
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it('uses custom retryLabel', () => {
      render(<ErrorState onRetry={() => void 0} retryLabel="Reload" />);
      expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    });
  });
});
