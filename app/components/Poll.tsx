// Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { ChangeEvent, useContext, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import classNames from 'classnames/bind';
import screenPicketStyles from './ScreenPicker.css';
import getBaseUrl from '../utils/getBaseUrl';
import ChimeSdkWrapper from '../chime/ChimeSdkWrapper';
import getChimeContext from '../context/getChimeContext';

const cx = classNames.bind(screenPicketStyles);

export enum PollStatus {
  Pending,
  Create,
  Answer,
  CheckOut
}

type Props = {
  onClickCancelButton: () => void;
};

export default function Poll(props: Props) {
  const intl = useIntl();
  const chime: ChimeSdkWrapper | null = useContext(getChimeContext());
  const { onClickCancelButton } = props;
  const [question, setQuestion] = useState('Title');
  const pollAnswers = ['', '', '', ''];

  return (
    <div className={cx('screenPicker')}>
      <div className={cx('top')}>
        <h1 className={cx('header')}>{question}</h1>
      </div>
      <div>
        <h3>
          <FormattedMessage id="Poll.title" />
          <br />
          <input
            placeholder="Type something"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              if (event.target.value.length === 0) setQuestion('Title');
              else setQuestion(event.target.value);
            }}
          />
        </h3>
        {pollAnswers.map((_: string, index: number) => {
          return (
            <h4 key={`choice-${index}`}>
              {intl.formatMessage(
                {
                  id: 'Poll.choice'
                },
                {
                  id: index
                }
              )}
              <br />
              <input
                placeholder="Type something"
                onChange={event => {
                  pollAnswers[index] = event.target.value;
                }}
              />
            </h4>
          );
        })}
      </div>
      <div className={cx('bottom')}>
        <div className={cx('buttons')}>
          <button
            type="button"
            className={cx('shareButton', {
              enabled: true
            })}
            onClick={async () => {
              const body = {
                meetingId: chime?.meetingSession?.configuration.meetingId,
                question,
                answers: pollAnswers
              };
              const response = await fetch(`${getBaseUrl()}createpoll`, {
                method: 'POST',
                body: JSON.stringify(body)
              });
              const json = await response.json();
              // eslint-disable-next-line no-console
              console.log(json);
            }}
          >
            <FormattedMessage id="Poll.submit" />
          </button>
          <button
            type="button"
            className={cx('cancelButton')}
            onClick={onClickCancelButton}
          >
            <FormattedMessage id="Poll.cancel" />
          </button>
        </div>
      </div>
    </div>
  );
}
