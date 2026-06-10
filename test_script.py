import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the app
        await page.goto("http://localhost:5173")

        # Inject state using window.useStore to have an active course
        await page.evaluate("""
            const state = window.useStore.getState();
            state.setActiveCourse({
                id: 'course-1',
                title: 'Test Course',
                concepts: [
                    { id: 'c1', title: 'Variables', status: 'completed' },
                    { id: 'c2', title: 'Functions', status: 'pending', prerequisites: ['c1'] },
                    { id: 'c3', title: 'Loops', status: 'pending', prerequisites: ['c1'] },
                    { id: 'c4', title: 'Advanced Topics', status: 'pending', prerequisites: ['c2'] }
                ]
            });
            state.setActiveConcept({ id: 'c1', title: 'Variables', status: 'completed' });
        """)

        # Wait a bit for React to render the sidebar
        await asyncio.sleep(1)

        # Take a screenshot before searching
        await page.screenshot(path="screenshot_before_search.png")

        # Type into the search input
        await page.fill('input[placeholder="Search concepts..."]', "func")

        # Wait a bit for the list to filter
        await asyncio.sleep(1)

        # Take a screenshot after searching
        await page.screenshot(path="screenshot_after_search.png")

        await browser.close()

asyncio.run(main())
