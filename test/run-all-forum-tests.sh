#!/bin/bash

# Run All Forum Tests Script
echo "🧪 Running ALL Forum Integration Tests..."
echo "========================================"
echo ""

# Check NODE_ENV
if [ "$NODE_ENV" != "test" ]; then
    echo "❌ ERROR: NODE_ENV must be set to 'test'"
    echo "Run: export NODE_ENV=test"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test and track results
run_test() {
    TEST_FILE=$1
    TEST_NAME=$2
    
    echo -e "${YELLOW}Running $TEST_NAME...${NC}"
    npm test -- $TEST_FILE --timeout 30000 --exit > /tmp/test_output.txt 2>&1
    EXIT_CODE=$?
    
    # Count passing/failing
    PASSING=$(grep -oP '\d+(?= passing)' /tmp/test_output.txt | head -1 || echo "0")
    FAILING=$(grep -oP '\d+(?= failing)' /tmp/test_output.txt | head -1 || echo "0")
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ $TEST_NAME: $PASSING passing${NC}"
        PASSED_TESTS=$((PASSED_TESTS + PASSING))
    else
        echo -e "${RED}❌ $TEST_NAME: $PASSING passing, $FAILING failing${NC}"
        PASSED_TESTS=$((PASSED_TESTS + PASSING))
        FAILED_TESTS=$((FAILED_TESTS + FAILING))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + PASSING + FAILING))
    echo ""
}

# Run all forum tests
run_test "test/services/classes/community-sync.test.ts" "Community Sync Tests"
run_test "test/services/forum-tags/forum-tags.test.ts" "Forum Tags Tests"
run_test "test/services/forum-posts/forum-posts.test.ts" "Forum Posts Tests"
run_test "test/services/forum-post-upvote/forum-post-upvote.test.ts" "Forum Post Upvote Tests"

echo "========================================"
echo "📊 Final Test Summary"
echo "========================================"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All Forum Tests Passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some Tests Failed${NC}"
    exit 1
fi

