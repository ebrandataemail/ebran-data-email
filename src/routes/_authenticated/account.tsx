import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Backward-compatible URL for older Gmail OAuth callbacks and bookmarks.
 * The canonical account-management page is /accounts.
 *
 * Keep the query string intact so Gmail callback status (for example,
 * ?gmail=connected) is still available to the AccountsView after redirect.
 */
export const Route = createFileRoute("/_authenticated/account")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `/accounts${location.searchStr}`,
      replace: true,
    });
  },
});
