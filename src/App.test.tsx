import { render, screen } from '@testing-library/react';
import App from './App';

describe('Rutika portfolio landing page', () => {
  it('renders the original portfolio content with the updated visual system', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /Rutika Bhasme/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Advanced Computing Student based in Sydney/i)).toBeInTheDocument();
    expect(screen.getByText(/INK IT Solutions/i)).toBeInTheDocument();
    expect(screen.getByText(/University of Sydney/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Get in Touch/i })).toHaveLength(2);
  });
});
