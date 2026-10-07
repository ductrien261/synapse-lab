# Anatomy tutor activities

`POST /api/tutor/action/` accepts `action` (`quiz`, `scenario`, `summary`, or `flashcards`), `model_uid`, optional `part_index`, `conversation_id`, `topic`, and `style`. It asks the AI service to retrieve medical document chunks, generate a cited activity, and stores the result in the tutor conversation. Missing relevant source returns an error without creating an activity.

Quiz and scenario answers stay hidden until `POST /api/tutor/messages/<id>/action-answer/` receives `{ "choice": 0 }`. `GET /api/tutor/conversations/<id>/` restores the activity and its answer state. The fields `action_kind` and `action_data` are added by migration `0003_tutormessage_action`; deploy this migration before enabling the buttons.

The previous cardiac veins sample is preserved in `fe/src/components/anatomy/demo-archive/` and is not imported by the learner page.
