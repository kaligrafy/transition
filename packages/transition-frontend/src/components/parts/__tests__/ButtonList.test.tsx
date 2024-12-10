/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import ButtonList from '../ButtonList';

test('Default props', () => {
    const input = render(<ButtonList
        key = 'key'
    >test</ButtonList>);
    expect(input).toMatchSnapshot();
});

test('With classname', () => {
    const input = render(<ButtonList
        key = 'key'
        className = 'myClass'
    >test</ButtonList>);
    expect(input).toMatchSnapshot();
});
