#!/bin/bash
FEATURE=$1
BE_BRIEF=$2   # path to fe-brief log file from BE

if [ -z "$FEATURE" ] || [ -z "$BE_BRIEF" ]; then
  echo "Usage: ./implement-fe-feature.sh <feature> <path-to-fe-brief>"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="logs"
mkdir -p $LOG_DIR

echo "=== Phase 1: Domain (interactive) ==="
echo "Review the BE brief before proceeding:"
cat $BE_BRIEF
echo ""
echo "Starting domain session — approve TypeScript interfaces..."

claude --add-dir modules/domain \
  --context "Feature: $FEATURE. BE API brief: $(cat $BE_BRIEF)"

echo "Domain session finished. Starting parallel sessions..."

echo "=== Phase 2: Parallel headless sessions ==="

claude -p \
  "Feature: $FEATURE. Implement application layer. Reference: @skills/implementation-workflow.md. BE brief: $(cat $BE_BRIEF)" \
  --add-dir modules/domain \
  --add-dir modules/application \
  > $LOG_DIR/fe-$FEATURE-application-$TIMESTAMP.log 2>&1 &

claude -p \
  "Feature: $FEATURE. Implement infrastructure layer. Reference: @skills/implementation-workflow.md. BE brief: $(cat $BE_BRIEF)" \
  --add-dir modules/domain \
  --add-dir modules/infrastructure \
  > $LOG_DIR/fe-$FEATURE-infrastructure-$TIMESTAMP.log 2>&1 &

claude -p \
  "Feature: $FEATURE. Implement ui layer. Reference: @skills/implementation-workflow.md. BE brief: $(cat $BE_BRIEF)" \
  --add-dir modules/domain \
  --add-dir modules/application \
  --add-dir modules/infrastructure \
  --add-dir modules/ui \
  > $LOG_DIR/fe-$FEATURE-ui-$TIMESTAMP.log 2>&1 &

wait

echo ""
echo "=== Done: $FEATURE ==="
echo "Logs:"
ls -la $LOG_DIR/fe-$FEATURE-*-$TIMESTAMP.log
echo ""
echo "Review changes:"
echo "./scripts/review-implementation.sh"