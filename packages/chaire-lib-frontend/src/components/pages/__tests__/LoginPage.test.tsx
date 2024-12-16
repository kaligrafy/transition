import * as React from 'react';
import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
enableFetchMocks();

// hack to make react-router work with jest
import { TextEncoder } from 'node:util';
global.TextEncoder = TextEncoder;

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router';
import { setApplicationConfiguration } from '../../../config/application.config';
import LoginPage from '../LoginPage';

const mockHomePage = '/Homepage';
setApplicationConfiguration({ homePage: mockHomePage });

import configureStore from '../../../store/configureStore';  // Create similar to docs example

const renderWithProviders = (
    ui,
    {
        preloadedState = {
            auth: {
                isAuthenticated: false
            }
        },
        store = configureStore(preloadedState),
        initialEntries = ['/login'],
        ...renderOptions
    } = {}
) => {
    const Wrapper = ({ children }) => (
        <Provider store={store}>
            <MemoryRouter initialEntries={initialEntries}>
                <Routes>
                    <Route path="/login" element={children} />
                    <Route path={mockHomePage} element={<div>Home Page</div>} />
                    <Route path="/register" element={<div>Register Page</div>} />
                    <Route path="/forgot" element={<div>Forgot Password Page</div>} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );

    return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

const handlers = [
    http.post('/api/login', async ({ request }) => {
        return HttpResponse.json({ user: 'user1' });
    })
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('Correct credentials with location state', async () => {
    const { store } = renderWithProviders(
        <LoginPage config={{}} />
    );

    const usernameInput = screen.getByLabelText('auth:UsernameOrEmail');
    fireEvent.change(usernameInput, { target: { value: 'user1' } });

    const passwordInput = screen.getByLabelText('auth:Password');
    fireEvent.change(passwordInput, { target: { value: 'pass1' } });

    const loginButton = screen.getByText('auth:Login');
    fireEvent.click(loginButton);

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
});

test('Shows registration link when enabled', () => {
    renderWithProviders(
        <LoginPage config={{
            allowRegistration: true
        }} />
    );

    expect(screen.getByText('auth:registerIfYouHaveNoAccount')).toBeInTheDocument();
});

test('Incorrect and partial credentials', async () => {
    renderWithProviders(
        <LoginPage config={{}} />
    );

    const loginButton = screen.getByText('auth:Login');
    fireEvent.click(loginButton);
    expect(screen.getByText('auth:missingUsernameOrEmail')).toBeInTheDocument();

    const usernameInput = screen.getByLabelText('auth:UsernameOrEmail');
    fireEvent.change(usernameInput, { target: { value: 'user1' } });

    fireEvent.click(loginButton);
    expect(screen.getByText('auth:missingPassword')).toBeInTheDocument();

    const passwordInput = screen.getByLabelText('auth:Password');
    fireEvent.change(passwordInput, { target: { value: 'pass1' } });

    fireEvent.click(loginButton);

    // Use findByText for async expectations
    expect(await screen.findByText('Home Page')).toBeInTheDocument();
});

/*test('Hides registration link when disabled', () => {
    renderWithProviders(
        <LoginPage config={{
            allowRegistration: false
        }}/>
    );

    expect(screen.queryByText('auth:registerIfYouHaveNoAccount')).not.toBeInTheDocument();
});

describe('Login page rendering', () => {
    test('Is already authenticated, redirect to home page', () => {
        const store = mockStore({
            auth: {
                isAuthenticated: true,
            }
        });

        renderWithProviders(
            <LoginPage config={{
                allowRegistration: true,
                forgotPasswordPage: true
            }}/>,
            { store }
        );

        expect(screen.getByText('Home Page')).toBeInTheDocument();
    });

    test('Allow registration', () => {
        const { container } = renderWithProviders(
            <LoginPage config={{
                allowRegistration: true
            }}/>
        );
        expect(container).toMatchSnapshot();
    });

    test('Registration not allowed', () => {
        const { container } = renderWithProviders(
            <LoginPage config={{
                allowRegistration: false
            }}/>
        );
        expect(container).toMatchSnapshot();
    });

    test('Allow forget password', () => {
        const { container } = renderWithProviders(
            <LoginPage config={{
                forgotPasswordPage: true
            }}/>
        );
        expect(container).toMatchSnapshot();
    });
});

describe('Login page behavior', () => {
    afterEach(() => {
        cleanup();
        fetchMock.resetMocks();
    });

    test('Registration link, no forgot password', () => {
        renderWithProviders(
            <LoginPage config={{}}/>
        );

        const link = screen.getByText('auth:registerIfYouHaveNoAccount');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/register');

        expect(screen.queryByText('auth:forgotPassword')).not.toBeInTheDocument();
    });

    test('Redirect to forgot password page', () => {
        renderWithProviders(
            <LoginPage config={{
                forgotPasswordPage: true
            }}/>
        );

        const link = screen.getByText('auth:forgotPassword');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/forgot');
    });

    test('Incorrect and partial credentials', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ user: 'user1' }));

        renderWithProviders(
            <LoginPage config={{}}/>
        );

        expect(screen.queryByText('auth:missingUsernameOrEmail')).not.toBeInTheDocument();

        const loginButton = screen.getByText('auth:Login');
        fireEvent.click(loginButton);
        expect(screen.getByText('auth:missingUsernameOrEmail')).toBeInTheDocument();

        const usernameInput = screen.getByLabelText('auth:UsernameOrEmail');
        fireEvent.change(usernameInput, { target: { value: 'user1' } });

        fireEvent.click(loginButton);
        expect(screen.queryByText('auth:missingUsernameOrEmail')).not.toBeInTheDocument();
        expect(screen.getByText('auth:missingPassword')).toBeInTheDocument();

        const passwordInput = screen.getByLabelText('auth:Password');
        fireEvent.change(passwordInput, { target: { value: 'pass1' } });

        fireEvent.click(loginButton);
        await TestUtils.flushPromises();

        expect(screen.queryByText('auth:missingPassword')).not.toBeInTheDocument();
        expect(screen.getByText('Home Page')).toBeInTheDocument();
    });

    test('Correct credentials with location state', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ user: 'user1' }));

        renderWithProviders(
            <LoginPage config={{}}/>,
            {
                initialEntries: ['/login/']
            }
        );

        const usernameInput = screen.getByLabelText('auth:UsernameOrEmail');
        fireEvent.change(usernameInput, { target: { value: 'user1' } });

        const passwordInput = screen.getByLabelText('auth:Password');
        fireEvent.change(passwordInput, { target: { value: 'pass1' } });

        const loginButton = screen.getByText('auth:Login');
        fireEvent.click(loginButton);

        await TestUtils.flushPromises();
        expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
});*/
