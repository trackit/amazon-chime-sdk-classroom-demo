// Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { ChangeEvent, useContext, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import classNames from 'classnames/bind';
import screenPicketStyles from './ScreenPicker.css';
import getBaseUrl from '../utils/getBaseUrl';
import ChimeSdkWrapper from '../chime/ChimeSdkWrapper';
import getChimeContext from '../context/getChimeContext';
import MessageTopic from '../enums/MessageTopic';

const cx = classNames.bind(screenPicketStyles);

export enum PollStatus {
  Active,
  Inactive
}

type PropsCloseFunction = {
  onClickCancelButton: () => void;
};

export interface InternalPollData {
  pollId: string;
  status: PollStatus;
  title: string;
  answers: Array<string>;
}

export interface PollData extends InternalPollData {
  answered: boolean;
}

export default function Poll(props: PropsCloseFunction) {
  const [poll, setPoll] = useState({
    status: PollStatus.Inactive,
    answers: ['', '', '', '']
  } as InternalPollData);
  const intl = useIntl();
  const chime: ChimeSdkWrapper | null = useContext(getChimeContext());
  const { onClickCancelButton } = props;
  const [status, setStatus] = useState('');

  const notifyStudents = (pollData: InternalPollData) => {
    chime?.sendMessage(MessageTopic.PollStatusUpdate, pollData as PollData);
  };

  return (
    <div className={cx('screenPicker')}>
      <div className={cx('top')}>
        <h1 className={cx('header')}>{poll.title}</h1>
      </div>
      <div>
        <h3>
          <FormattedMessage id="Poll.title" />
          <br />
          <input
            placeholder={intl.formatMessage({ id: 'Poll.inputPlaceHolder' })}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              if (event.target.value.length === 0)
                setPoll({
                  ...poll,
                  title: 'Title'
                });
              else
                setPoll({
                  ...poll,
                  title: event.target.value
                });
            }}
          />
        </h3>
        {poll.answers.map((_: string, index: number) => {
          // if ()
          return (
            // The array's size remains the same
            // eslint-disable-next-line react/no-array-index-key
            <h4 key={`choice-${index}`}>
              {intl.formatMessage(
                {
                  id: 'Poll.choice'
                },
                {
                  id: index + 1
                }
              )}
              <br />
              <input
                placeholder={intl.formatMessage({
                  id: 'Poll.inputPlaceHolder'
                })}
                onChange={event => {
                  poll.answers[index] = event.target.value;
                  setPoll(poll);
                }}
              />
            </h4>
          );
        })}
      </div>
      {status.length > 0 && status}
      <div className={cx('bottom')}>
        <div className={cx('buttons')}>
          <button
            type="button"
            className={cx('shareButton', {
              enabled: true
            })}
            onClick={async () => {
              if (poll.status === PollStatus.Active) {
                setStatus(intl.formatMessage({ id: 'Poll.pollAlreadyActive' }));
                return;
              }
              const body = {
                meetingId: chime?.meetingSession?.configuration.meetingId,
                title: poll.title,
                answers: poll.answers
              };
              await fetch(`${getBaseUrl()}createpoll`, {
                method: 'POST',
                body: JSON.stringify(body)
              })
                .then(async (rep: Response) => {
                  if (!rep.ok) {
                    setStatus(
                      intl.formatMessage({ id: 'Poll.unableSubmitPoll' })
                    );
                    return rep;
                  }
                  const json = await rep.json();
                  setPoll({
                    ...poll,
                    pollId: json.pollId,
                    status: PollStatus.Active
                  });
                  notifyStudents(poll);
                  setStatus(
                    intl.formatMessage({ id: 'Poll.successfullySubmitPoll' })
                  );
                  return rep;
                })
                .catch(() => {
                  setStatus(
                    intl.formatMessage({ id: 'Poll.unableSubmitPoll' })
                  );
                });
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

type PollStudentProps = {
  poll: PollData;
  onClickCancelButton: () => void;
};

export function PollStudent(props: PollStudentProps) {
  const intl = useIntl();
  const { poll, onClickCancelButton } = props;
  const [status, setStatus] = useState('');

  return (
    <div className={cx('screenPicker')}>
      {poll.status === PollStatus.Inactive ? (
        <>
          <h1>
            <FormattedMessage id="Poll.noActivePoll" />
          </h1>
        </>
      ) : (
        <>
          <div className={cx('top')}>
            <h1 className={cx('header')}>{poll.title}</h1>
          </div>
          {poll.answers.map((value: string, index: number) => {
            return (
              <>
                <button
                  disabled={poll.answered || !value.length}
                  // eslint-disable-next-line react/no-array-index-key
                  key={`choice-${index}`}
                  type="button"
                  className={cx('cancelButton')}
                  onClick={async () => {
                    const body = {
                      pollId: poll.pollId,
                      answerIdx: index
                    };
                    await fetch(`${getBaseUrl()}answerpoll`, {
                      method: 'POST',
                      body: JSON.stringify(body)
                    }).catch(() => {
                      setStatus(
                        intl.formatMessage({ id: 'Poll.unableSubmitVote' })
                      );
                    });
                    poll.answered = !poll.answered;
                  }}
                >
                  {value.length === 0
                    ? intl.formatMessage({
                        id: 'Poll.inputEmpty'
                      })
                    : value}
                </button>
                <br />
              </>
            );
          })}
        </>
      )}
      {status.length && status}
      <button
        type="button"
        className={cx('cancelButton')}
        onClick={onClickCancelButton}
      >
        <FormattedMessage id="Poll.cancel" />
      </button>
    </div>
  );
}
