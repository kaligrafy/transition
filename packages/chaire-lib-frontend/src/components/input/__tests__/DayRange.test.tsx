/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import each from 'jest-each';

import DayRange from '../DayRange';

const mockOnChange = jest.fn();
const testId = 'DayRangeWidgetId';



test('All props', () => {
    const { container } = render(<DayRange
        id = {testId}
        onChange = {mockOnChange}
        days = {[0,1,2]}
        disabled = {false}
        showPeriodDropdown = {true}
    />);
    expect(container.firstChild).toMatchSnapshot();
});

test('Disabled', () => {
    const { container } = render(<DayRange
        id = {testId}
        onChange = {mockOnChange}
        days = {[0,1,2]}
        disabled = {true}
    />);
    expect(container.firstChild).toMatchSnapshot();
});

test('Do not show dropdown', () => {
    const { container } = render(<DayRange
        id = {testId}
        onChange = {mockOnChange}
        days = {[0,1,2]}
        showPeriodDropdown = {false}
    />);
    expect(container.firstChild).toMatchSnapshot();
});

const getDayButton = (container: HTMLElement, day: string) => {
    return container.querySelector(`#${testId}_${day}`) as HTMLInputElement;
};

const verifyCheckedDays = (container: HTMLElement, days: number[]) => {
    const mondayElement = getDayButton(container, 'Monday');
    const tuesdayElement = getDayButton(container, 'Tuesday');
    const wednesdayElement = getDayButton(container, 'Wednesday');
    const thursdayElement = getDayButton(container, 'Thursday');
    const fridayElement = getDayButton(container, 'Friday');
    const saturdayElement = getDayButton(container, 'Saturday');
    const sundayElement = getDayButton(container, 'Sunday');
    expect(mondayElement.checked).toEqual(days.includes(0));
    expect(tuesdayElement.checked).toEqual(days.includes(1));
    expect(wednesdayElement.checked).toEqual(days.includes(2));
    expect(thursdayElement.checked).toEqual(days.includes(3));
    expect(fridayElement.checked).toEqual(days.includes(4));
    expect(saturdayElement.checked).toEqual(days.includes(5));
    expect(sundayElement.checked).toEqual(days.includes(6));
};

describe('Period group selection change', () => {
    each([
        ['week', [0, 1, 2, 3, 4]],
        ['week-end', [5, 6]],
        ['all', [0, 1, 2, 3, 4, 5, 6]]
    ]).test('Period group selection for "%s"', (period, indices) => {
        const { container } = render(<DayRange
            id = {testId}
            onChange = {mockOnChange}
            days = {[0,1,2]}
            disabled = {false}
        />);

        mockOnChange.mockClear();

        // Validate initial values
        const periodGroupElement = container.querySelector(`#${testId}_periodGroup`) as HTMLInputElement;
        expect(periodGroupElement.value).toBe('custom');

        // Check the period and validate the choices
        fireEvent.change(periodGroupElement, { target: { value: period } });
        expect(mockOnChange).toHaveBeenCalledTimes(1);
        expect(mockOnChange).toHaveBeenCalledWith(indices);

    });

});

describe('Days selection change', () => {
    each([
        ['Monday', 0],
        ['Tuesday', 1],
        ['Wednesday', 2],
        ['Thursday', 3],
        ['Friday', 4],
        ['Saturday', 5],
        ['Sunday', 6],
    ]).test('Days selection for "%s"', async (day, index) => {

        const user = userEvent.setup();

        render(<DayRange
            id = {testId}
            onChange = {mockOnChange}
            days = {[]}
            disabled = {false}
        />);

        mockOnChange.mockClear();
        expect(screen.getByTitle(day)).toBeInTheDocument();
        expect(screen.getByTitle(day)).not.toBeChecked();
        await user.click(screen.getByTitle(day) as HTMLInputElement);
        expect(screen.getByTitle(day)).toBeChecked();
        //console.log('getByTitle1', day, (screen.getByTitle(day) as HTMLInputElement).checked);
        // Check and uncheck the button

        //expect( screen.getByTitle(day)).toBeChecked();
        //expect(mockOnChange).toHaveBeenCalledTimes(1);
        //expect(mockOnChange).toHaveBeenCalledWith([index]);

        await user.click(screen.getByTitle(day));
        console.log('getByTitle2', day, (screen.getByTitle(day) as HTMLInputElement).checked);

        //expect( screen.getByTitle(day)).not.toBeChecked();
        //expect(mockOnChange).toHaveBeenCalledTimes(2);
        //expect(mockOnChange).toHaveBeenLastCalledWith([]);
    });

});

describe('Integration periods and days with props', () => {
    each([
        ['week', [0, 1, 2, 3, 4]],
        ['week-end', [5, 6]],
        ['all', [0, 1, 2, 3, 4, 5, 6]],
        ['custom', [1, 3, 5]]
    ]).test('Integration periods and days with props "%s"', (period, dayRange) => {
        const { container } = render(<DayRange
            id = {testId}
            onChange = {mockOnChange}
            days = {[0, 1, 2]}
            disabled = {false}
        />);

        mockOnChange.mockClear();

        // Change the props to the week days
        const periodGroupElement = container.querySelector(`#${testId}_periodGroup`) as HTMLInputElement;
        fireEvent.change(periodGroupElement, { target: { value: period } });
        expect(mockOnChange).toHaveBeenCalledTimes(1);
        expect(mockOnChange).toHaveBeenCalledWith(dayRange);
        verifyCheckedDays(container, dayRange);
    });
});
