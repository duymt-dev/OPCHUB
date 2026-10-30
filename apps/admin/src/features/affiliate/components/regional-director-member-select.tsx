'use client';

import { Button, Form, Select } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useDirectorMembers } from '../hooks/use-director-members';

export function RegionalDirectorMemberSelect() {
  const t = useTranslations('affiliate.directors');
  const [search, setSearch] = useState('');
  const members = useDirectorMembers(search, true);
  return (
    <>
      <Form.Item name="userId" label={t('member')}>
        <Select
          showSearch={{ filterOption: false, onSearch: setSearch }}
          placeholder={t('searchMember')}
          loading={members.isFetching}
          options={
            members.data?.pages.flatMap((page) =>
              page.items.map((member) => ({
                value: member.id,
                label: `${member.fullName} · ${member.email} · ${member.memberCode}`,
              })),
            ) ?? []
          }
        />
      </Form.Item>
      {members.isError ? (
        <Button onClick={() => void members.refetch()}>{t('retry')}</Button>
      ) : null}
      {members.hasNextPage ? (
        <Button onClick={() => void members.fetchNextPage()} loading={members.isFetchingNextPage}>
          {t('moreMembers')}
        </Button>
      ) : null}
    </>
  );
}
