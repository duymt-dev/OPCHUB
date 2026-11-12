'use client';

import { Component, type ReactNode } from 'react';
import { ErrorState } from '@opchub/ui';
import { resetFailedAdminIntl } from '@/i18n/intl/runtime';
import { AdminIntlResourceError } from '@/i18n/intl/resource-error';
import { logger } from '@/lib/logger';

interface Props {
  locale: string;
  title: string;
  retryLabel: string;
  children: ReactNode;
}

export class AdminIntlResourceBoundary extends Component<
  Props,
  { failed: boolean; locale: string }
> {
  override state = { failed: false, locale: this.props.locale };

  static getDerivedStateFromProps(props: Props, state: { locale: string }) {
    return props.locale !== state.locale ? { failed: false, locale: props.locale } : null;
  }

  static getDerivedStateFromError(error: unknown) {
    if (!(error instanceof AdminIntlResourceError)) throw error;
    return { failed: true };
  }

  override componentDidCatch(error: Error) {
    logger.error('i18n-resources', error);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorState
        title={this.props.title}
        retryLabel={this.props.retryLabel}
        onRetry={() => {
          resetFailedAdminIntl(this.props.locale);
          this.setState({ failed: false });
        }}
      />
    );
  }
}
