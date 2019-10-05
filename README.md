# ethz-summary-of-credits

> Protocol for interacting with MyStudies

This is a library that can authenticate against the ETH Zurich myStudies platform. It is able to extract grades, courses, examination dates and more data from the myStudies platform into a JSON format.

This code was used in [Bestande](https://bestande.ch) 3.0 for enabling a ETHZ login feature which would allow users to see an overview of their courses and grades as well as their timetable.

Please note that we have since then removed the feature since ETHZ is arguing that it is not allowed for students to enter their credentials into third party apps. We are releasing this code for personal, educational and research purposes and do not suggest that you should build an app which accepts ETHZ credentials. This also means that we are not anymore using this code and that it can break in the future, and that we can not guarantee support for this library.

## Installation
The code is not published in any registry, you have to build the library from source. Clone this repository and run
```sh
npm install
npx tsc
```

to build the library. The entry point will be in `dist/scraper` the function `fetchAll`.

## Example
There is an example included which allows you to enter your shortname and password and which will return the JSON response for your account.
Simply enter the shortname and password in `src/example.ts` and then run `npm run example`.

## See also

- [uzh-summary-of-credits](https://github.com/Bestande/uzh-summary-of-credits) - The UZH version of this library

## License

MIT
