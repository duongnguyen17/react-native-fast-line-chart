# Apply the FastLineChart migration

The patch updates the price-search chart and its comparison screen. It preserves
the existing date labels, price format, min/max markers, chart offsets, and
tooltip position calculations. The adapter accepts the colors already returned
by React Native's `processColor`.

Run these commands from the chart library checkout to build and pack the npm
package. The tarball includes compiled JavaScript and generated Nitro bindings.

```sh
yarn prepare
npm pack --ignore-scripts --pack-destination /tmp
```

Run these commands from the ai-travel-app mobile checkout.

```sh
git apply --check /absolute/path/to/react-native-fast-line-chart/docs/ai-travel-mobile-migration.patch
mkdir -p vendor
cp /tmp/2security-fast-line-chart-0.1.0.tgz vendor/
git apply /absolute/path/to/react-native-fast-line-chart/docs/ai-travel-mobile-migration.patch
yarn install
yarn type:check
yarn pod
```

Build Android and iOS from the mobile checkout. Use one price-search dataset
with consecutive equal prices and one comparison dataset with over 100 total
points. Check that extrema labels appear before zooming, that equal labels
reappear after a gap, and that tapping a point places the tooltip correctly in
both compact and expanded views.

Treat the local tarball path as an artifact for this migration check. For a
shared or release build, use the team's package registry or ensure the tarball
is available in every build checkout. Regenerate the app's lockfiles through
the install commands.
