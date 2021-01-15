// Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { ChangeEvent, useContext, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import classNames from 'classnames/bind';
import screenPicketStyles from './ScreenPicker.css';
import pollStyles from './Poll.css';
import getBaseUrl from '../utils/getBaseUrl';
import ChimeSdkWrapper from '../chime/ChimeSdkWrapper';
import getChimeContext from '../context/getChimeContext';
import MessageTopic from '../enums/MessageTopic';

const cx = classNames.bind(screenPicketStyles);
const cxPoll = classNames.bind(pollStyles);

export enum PollStatus {
  Active,
  Inactive
}

export type PollProps = {
  onClickCancelButton: () => void;
  existingPoll: PollData;
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

export interface PollStats extends PollData {
  stats: Array<number>;
  total: number;
}

export default function Poll(props: PollProps) {
  const { onClickCancelButton, existingPoll } = props;
  const [poll, setPoll] = useState({
    ...existingPoll,
    answers: ['', '', '', '']
  } as InternalPollData);
  const intl = useIntl();
  const chime: ChimeSdkWrapper | null = useContext(getChimeContext());
  const [status, setStatus] = useState('');
  const [pollStats, setPollStats] = useState({} as PollStats);

  return (
    <>
      <div className={cx('screenPicker')}>
        <div className={cx('top')}>
          <h1 className={cx('header')}>{poll.title}</h1>
        </div>
        <div className={cxPoll('core')}>
          <h3>
            <FormattedMessage id="Poll.title" />
            {pollStats.stats !== undefined &&
              ` - Total response(s): ${pollStats.total}`}
            <br />
            <input
              placeholder={intl.formatMessage({ id: 'Poll.inputPlaceHolder' })}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                if (event.target.value.length === 0)
                  setPoll({
                    ...poll,
                    title: 'No title set'
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
            return (
              // The array's size remains the same
              // eslint-disable-next-line react/no-array-index-key
              <h4 className={cx('items')} key={`choice-${index}`}>
                {intl.formatMessage(
                  {
                    id: 'Poll.choice'
                  },
                  {
                    id: index + 1
                  }
                )}
                {pollStats.stats !== undefined && (
                  <>
                    {` | Vote ${pollStats.stats[index]} - `}
                    {pollStats.total === 0
                      ? 0
                      : (pollStats.stats[index] / pollStats.total) * 100.0}
                    %
                  </>
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
                  setPoll((prePoll: InternalPollData) => {
                    const newPollData = prePoll;
                    newPollData.status = PollStatus.Inactive;
                    return newPollData;
                  });
                  chime?.sendMessage(
                    MessageTopic.PollStatusUpdate,
                    poll as PollData
                  );
                  await fetch(`${getBaseUrl()}listpollanswer`, {
                    method: 'POST',
                    body: JSON.stringify({
                      pollId: poll.pollId,
                      meetingId: chime?.meetingSession?.configuration.meetingId
                    })
                  })
                    .then(async (rep: Response) => {
                      if (!rep.ok) {
                        setStatus(
                          intl.formatMessage({ id: 'Poll.unableSubmitPoll' })
                        );
                        return rep;
                      }
                      const jsonBody = await rep.json();
                      setPollStats({
                        answered: true,
                        ...poll,
                        stats: jsonBody.stats,
                        total: jsonBody.count
                      });
                      setStatus('');
                      return rep;
                    })
                    .catch(() => {
                      setStatus(
                        intl.formatMessage({ id: 'Poll.unableSubmitPoll' })
                      );
                    });
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
                    setPoll((prePoll: InternalPollData) => {
                      const newPollData = prePoll;
                      newPollData.pollId = json.pollId;
                      newPollData.status = PollStatus.Active;
                      return newPollData;
                    });
                    chime?.sendMessage(
                      MessageTopic.PollStatusUpdate,
                      poll as PollData
                    );
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
              {poll.status === PollStatus.Active ? (
                <FormattedMessage id="Poll.close" />
              ) : (
                <FormattedMessage id="Poll.submit" />
              )}
            </button>
            <br />
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
    </>
  );
}

export function PollStudent(props: PollProps) {
  const intl = useIntl();
  const { onClickCancelButton, existingPoll } = props;
  const [status, setStatus] = useState('');
  const [poll, setPoll] = useState(existingPoll);

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
                  className={cx('shareButton', {
                    enabled: !(poll.answered || !value.length)
                  })}
                  onClick={async () => {
                    const body = {
                      pollId: poll.pollId,
                      answerIdx: index
                    };
                    await fetch(`${getBaseUrl()}answerpoll`, {
                      method: 'POST',
                      body: JSON.stringify(body)
                    })
                      .then((rep: Response) => {
                        setStatus(
                          intl.formatMessage({
                            id: 'Poll.successfullySubmitVote'
                          })
                        );
                        return rep;
                      })
                      .catch(() => {
                        setStatus(
                          intl.formatMessage({ id: 'Poll.unableSubmitVote' })
                        );
                      });
                    setPoll({
                      ...poll,
                      answered: true
                    });
                    existingPoll.answered = false;
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
      <div className={cx('bottom')}>
        {status.length > 0 && status}
        <button
          type="button"
          className={cx('cancelButton')}
          onClick={onClickCancelButton}
        >
          <FormattedMessage id="Poll.close" />
        </button>
      </div>
    </div>
  );
}
