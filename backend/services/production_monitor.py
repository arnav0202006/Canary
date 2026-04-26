import json
import re
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import difflib

from ..models import Agent, Version, AuditLog, ApiUsage
from ..services.deploy_service import rollback as manual_rollback
from .eval_service import load_test_suite, _get_agent_response


class ProductionMonitor:
    """Monitors live agent behavior and enforces general safety guardrails"""

    def __init__(self):
        self.test_suite = load_test_suite()
        # General safety patterns that indicate potential issues
        self.safety_patterns = {
            "uncertainty_indicators": [
                "i think", "i believe", "maybe", "perhaps", "i'm not sure",
                "let me check", "i'll try", "hopefully"
            ],
            "failure_indicators": [
                "i can't", "i'm unable", "i don't know", "i'm sorry, but",
                "unfortunately", "regrettably", "i apologize"
            ],
            "hallucination_indicators": [
                "according to our records", "our system shows", "we have confirmed",
                "our database indicates", "i can confirm", "we've verified"
            ],
            "inappropriate_actions": [
                "delete", "remove", "cancel", "terminate", "suspend",
                "ban", "block", "restrict", "disable"
            ]
        }

    def validate_agent_output(self, agent_id: str, user_input: str, agent_output: str,
                            context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Validates agent output against general safety rules and behavioral expectations
        """
        violations = []
        warnings = []
        risk_score = 0

        # Check against test suite patterns for similar inputs
        similar_tests = self._find_similar_test_cases(user_input)
        if similar_tests:
            expected_patterns = [test["expected_output"] for test in similar_tests]
            behavior_match = self._validate_behavioral_consistency(agent_output, expected_patterns, user_input)
            if not behavior_match["is_consistent"]:
                violations.append({
                    "rule": "behavioral_inconsistency",
                    "message": f"Agent behavior deviates from expected patterns: {behavior_match['reason']}",
                    "severity": "high",
                    "requires_rollback": False,
                    "confidence": behavior_match["confidence"]
                })
                risk_score += 35

        # Check for uncertainty in responses
        uncertainty_score = self._check_uncertainty_indicators(agent_output)
        if uncertainty_score > 0.1:  # Lower threshold - any uncertainty is concerning
            warnings.append({
                "rule": "high_uncertainty",
                "message": f"Agent response shows uncertainty ({uncertainty_score:.1%})",
                "severity": "medium"
            })
            risk_score += 25  # Higher penalty

        # Check for failure indicators
        failure_score = self._check_failure_indicators(agent_output)
        if failure_score > 0.2:  # Agent is failing/refusing too often
            violations.append({
                "rule": "frequent_failures",
                "message": f"Agent frequently indicates inability to help ({failure_score:.1%})",
                "severity": "high",
                "requires_rollback": True
            })
            risk_score += 40

        # Check for hallucination patterns
        hallucination_score = self._check_hallucination_indicators(agent_output)
        if hallucination_score > 0.4:
            violations.append({
                "rule": "potential_hallucination",
                "message": f"Agent may be fabricating information ({hallucination_score:.1%} confidence)",
                "severity": "critical",
                "requires_rollback": True
            })
            risk_score += 50

        # Check for inappropriate actions
        inappropriate_actions = self._check_inappropriate_actions(agent_output)
        if inappropriate_actions:
            violations.append({
                "rule": "inappropriate_actions",
                "message": f"Agent attempting inappropriate actions: {', '.join(inappropriate_actions)}",
                "severity": "critical",
                "requires_rollback": True
            })
            risk_score += 60

        # Overall risk assessment
        is_safe = risk_score < 25  # More conservative threshold
        requires_approval = risk_score >= 40  # Medium risk threshold

        return {
            "agent_id": agent_id,
            "user_input": user_input,
            "agent_output": agent_output,
            "violations": violations,
            "warnings": warnings,
            "risk_score": risk_score,
            "is_safe": is_safe,
            "requires_approval": requires_approval,
            "timestamp": datetime.utcnow().isoformat(),
            "context": context or {},
            "behavioral_analysis": behavior_match if 'behavior_match' in locals() else None
        }

    def _find_similar_test_cases(self, user_input: str, threshold: float = 0.4) -> List[Dict]:
        """Find test cases with similar inputs using fuzzy matching"""
        similar_tests = []
        user_input_lower = user_input.lower()

        for test in self.test_suite:
            test_input_lower = test["input"].lower()
            similarity = difflib.SequenceMatcher(None, user_input_lower, test_input_lower).ratio()
            if similarity >= threshold:
                similar_tests.append({**test, "similarity": similarity})

        return sorted(similar_tests, key=lambda x: x["similarity"], reverse=True)[:3]

    def _validate_behavioral_consistency(self, agent_output: str, expected_patterns: List[str], user_input: str) -> Dict:
        """Validate if agent output is consistent with expected behavior patterns"""
        # Focus on preventing complete failure to act rather than exact matches
        output_lower = agent_output.lower()
        user_input_lower = user_input.lower()

        # Check if agent is completely refusing to help when they should assist
        strong_refusal_indicators = ["i can't help", "i cannot assist", "i cannot help", "i'm unable to help", "i am unable to help", "i cannot do that", "i'm sorry, but i can't"]
        if any(indicator in output_lower for indicator in strong_refusal_indicators):
            # Check if the user is asking for help that should be provided
            help_keywords = ["return", "refund", "help", "assist", "order", "account", "billing", "cancel", "track", "status"]
            if any(keyword in user_input_lower for keyword in help_keywords):
                return {
                    "is_consistent": False,
                    "confidence": 0.9,
                    "reason": "Agent refuses to help when user is requesting assistance that should be provided"
                }

        # Check if agent is fabricating information inappropriately
        if "i can confirm" in output_lower and len(agent_output.split()) < 20:
            return {
                "is_consistent": False,
                "confidence": 0.7,
                "reason": "Agent makes strong claims without sufficient context"
            }

        # Default to consistent if no major issues found
        return {
            "is_consistent": True,
            "confidence": 0.8,
            "reason": "No major behavioral inconsistencies detected"
        }

    def _check_uncertainty_indicators(self, text: str) -> float:
        """Calculate uncertainty score based on hedging language"""
        text_lower = text.lower()
        words = text.split()
        if not words:
            return 0.0

        indicators_found = sum(1 for indicator in self.safety_patterns["uncertainty_indicators"]
                             if indicator in text_lower)
        return min(indicators_found / len(words) * 10, 1.0)  # Scale up for sensitivity

    def _check_failure_indicators(self, text: str) -> float:
        """Calculate failure/refusal score"""
        text_lower = text.lower()
        words = text.split()
        if not words:
            return 0.0

        indicators_found = sum(1 for indicator in self.safety_patterns["failure_indicators"]
                             if indicator in text_lower)
        return min(indicators_found / len(words) * 10, 1.0)

    def _check_hallucination_indicators(self, text: str) -> float:
        """Calculate hallucination confidence score"""
        text_lower = text.lower()
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        if not sentences:
            return 0.0

        indicators_found = sum(1 for indicator in self.safety_patterns["hallucination_indicators"]
                             if indicator in text_lower)
        # Higher weight for multiple authoritative statements
        return min(indicators_found / len(sentences), 1.0)

    def _check_inappropriate_actions(self, text: str) -> List[str]:
        """Identify potentially inappropriate actions"""
        text_lower = text.lower()
        found_actions = []
        for action in self.safety_patterns["inappropriate_actions"]:
            if action in text_lower:
                found_actions.append(action)
        return found_actions

    def monitor_production_request(self, db: Session, agent_id: str, user_input: str,
                                 agent_output: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Monitors a production request and takes action if violations are found
        """
        validation_result = self.validate_agent_output(agent_id, user_input, agent_output, context)

        # Log the monitoring event
        self._log_monitoring_event(db, validation_result)

        # Handle critical violations with automatic rollback
        critical_violations = [v for v in validation_result["violations"]
                             if v.get("severity") == "critical"]

        if critical_violations:
            self._handle_critical_violation(db, agent_id, validation_result, critical_violations)

        return validation_result

    def _handle_critical_violation(self, db: Session, agent_id: str,
                                 validation_result: Dict[str, Any],
                                 violations: List[Dict[str, Any]]):
        """
        Handles critical violations by automatically finding and rolling back to a suitable version
        """
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent or not agent.current_version_id:
            return

        # Log the critical violation
        _log_audit(db, agent_id, "critical_violation_detected",
                  agent.current_version_id, {
                      "violations": violations,
                      "user_input": validation_result["user_input"],
                      "agent_output": validation_result["agent_output"],
                      "risk_score": validation_result["risk_score"]
                  })

        # Find the best version to rollback to
        best_version = self._find_best_rollback_version(
            db, agent, validation_result["user_input"], validation_result["agent_output"]
        )

        if best_version:
            # Perform automatic rollback
            rollback_result = self._perform_automatic_rollback(db, agent, best_version, violations)

            # Log the automatic rollback
            _log_audit(db, agent_id, "automatic_rollback_completed",
                      best_version.id, {
                          "reason": "critical_violation",
                          "violations": violations,
                          "original_version": agent.current_version_id,
                          "risk_score": validation_result["risk_score"],
                          "rollback_strategy": "graph_traversal_with_testing"
                      })
        else:
            # No suitable version found - escalate to human
            _log_audit(db, agent_id, "automatic_rollback_failed",
                      agent.current_version_id, {
                          "reason": "no_suitable_version_found",
                          "violations": violations,
                          "user_input": validation_result["user_input"]
                      })

    def _find_best_rollback_version(self, db: Session, agent: Agent, failing_input: str, failing_output: str) -> Optional[Version]:
        """
        Traverses the version graph to find the best version that can handle the failing task
        """
        visited = set()
        candidates = []

        # Start with current version's parent
        current_version = db.query(Version).filter(Version.id == agent.current_version_id).first()
        if not current_version:
            return None

        # Traverse up the version graph (towards older versions)
        self._traverse_version_graph(db, current_version, visited, candidates, failing_input, 0)

        if not candidates:
            # If no candidates found in graph, try last known good as fallback
            if agent.last_known_good_id and agent.last_known_good_id != agent.current_version_id:
                lkg_version = db.query(Version).filter(Version.id == agent.last_known_good_id).first()
                if lkg_version and lkg_version.status == "production":
                    candidates.append((lkg_version, 0.5))  # Lower confidence for LKG fallback

        if not candidates:
            return None

        # Return the highest confidence candidate
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0]

    def _traverse_version_graph(self, db: Session, version: Version, visited: set,
                               candidates: list, failing_input: str, depth: int, max_depth: int = 5):
        """
        Recursively traverses version graph to find versions that can handle the failing task
        """
        if version.id in visited or depth > max_depth:
            return

        visited.add(version.id)

        # Test this version against the failing input
        confidence = self._test_version_compatibility(version, failing_input)

        if confidence > 0.7:  # High confidence threshold
            candidates.append((version, confidence))

        # Continue traversing to parent versions (older versions)
        if version.parent_version_id:
            parent = db.query(Version).filter(Version.id == version.parent_version_id).first()
            if parent and parent.status in ["production", "canary"]:  # Only consider stable versions
                self._traverse_version_graph(db, parent, visited, candidates, failing_input, depth + 1)

        # Also check sibling branches if they exist
        for child in version.child_versions:
            if child.status in ["production", "canary"] and child.id not in visited:
                sibling_confidence = self._test_version_compatibility(child, failing_input)
                if sibling_confidence > 0.8:  # Higher threshold for siblings
                    candidates.append((child, sibling_confidence))

    def _test_version_compatibility(self, version: Version, failing_input: str) -> float:
        """
        Tests if a version can handle the failing input by analyzing its capabilities
        """
        version_prompt = version.prompt.lower() if version.prompt else ""
        input_lower = failing_input.lower()

        # Extract key capabilities from version prompt
        capabilities = []
        if "return" in version_prompt or "refund" in version_prompt:
            capabilities.append("returns")
        if "order" in version_prompt or "track" in version_prompt:
            capabilities.append("orders")
        if "billing" in version_prompt or "payment" in version_prompt:
            capabilities.append("billing")
        if "help" in version_prompt or "assist" in version_prompt:
            capabilities.append("general_help")

        # Check what the failing input is asking for
        requested_capabilities = []
        if "return" in input_lower:
            requested_capabilities.append("returns")
        if "order" in input_lower or "track" in input_lower:
            requested_capabilities.append("orders")
        if "billing" in input_lower or "payment" in input_lower or "charge" in input_lower:
            requested_capabilities.append("billing")
        if "help" in input_lower:
            requested_capabilities.append("general_help")

        if not requested_capabilities:
            # Unknown request type - assume moderate compatibility
            return 0.5

        # Calculate compatibility score
        matching_caps = sum(1 for cap in requested_capabilities if cap in capabilities)
        compatibility = matching_caps / len(requested_capabilities)

        # Boost score if version has general help capability
        if "general_help" in capabilities:
            compatibility = min(compatibility + 0.3, 1.0)

        # Boost score if version has been in production (proven track record)
        if version.status == "production":
            compatibility = min(compatibility + 0.2, 1.0)

        return compatibility

    def _perform_automatic_rollback(self, db: Session, agent: Agent, target_version: Version,
                                   violations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Performs the actual rollback to the target version
        """
        original_version_id = agent.current_version_id

        # Mark current version as rolled back
        if original_version_id:
            current = db.query(Version).filter(Version.id == original_version_id).first()
            if current:
                current.status = "rolled_back"

        # Update agent to use target version
        agent.current_version_id = target_version.id
        agent.last_known_good_id = target_version.id  # Update LKG to this working version

        db.commit()

        return {
            "status": "success",
            "agent_id": agent.id,
            "rolled_back_from": original_version_id,
            "rolled_back_to": target_version.id,
            "version_number": target_version.version_number,
            "reason": "automatic_rollback_due_to_violations"
        }

    def _log_monitoring_event(self, db: Session, validation_result: Dict[str, Any]):
        """Logs monitoring events to audit log"""
        _log_audit(
            db,
            validation_result["agent_id"],
            "production_request_monitored",
            None,  # No specific version
            {
                "violations_count": len(validation_result["violations"]),
                "warnings_count": len(validation_result["warnings"]),
                "risk_score": validation_result["risk_score"],
                "is_safe": validation_result["is_safe"],
                "requires_approval": validation_result["requires_approval"]
            }
        )

    def get_monitoring_stats(self, db: Session, agent_id: str,
                           hours: int = 24) -> Dict[str, Any]:
        """Gets monitoring statistics for an agent from audit logs and api_usages."""
        from datetime import timedelta
        from ..models import AuditLog, ApiUsage, Version
        import json as _json

        since = datetime.utcnow() - timedelta(hours=hours)

        logs = db.query(AuditLog).filter(
            AuditLog.agent_id == agent_id,
            AuditLog.created_at >= since
        ).all()

        action_counts: Dict[str, int] = {}
        for log in logs:
            action_counts[log.action] = action_counts.get(log.action, 0) + 1

        violations_detected = action_counts.get("critical_violation_detected", 0)
        warnings_issued = action_counts.get("warning_issued", 0)
        automatic_rollbacks = action_counts.get("automatic_rollback", 0)

        # Risk scores are stored in audit log details for monitor events
        risk_scores = []
        for log in logs:
            if log.action in ("monitor_check", "critical_violation_detected", "warning_issued"):
                try:
                    details = _json.loads(log.details or "{}")
                    if "risk_score" in details:
                        risk_scores.append(float(details["risk_score"]))
                except (ValueError, TypeError):
                    pass

        avg_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0

        # Total requests: count api_usages for agent's versions in time window
        versions = db.query(Version).filter(Version.agent_id == agent_id).all()
        version_ids = [v.id for v in versions]
        total_requests = 0
        if version_ids:
            total_requests = db.query(ApiUsage).filter(
                ApiUsage.version_id.in_(version_ids),
                ApiUsage.timestamp >= since
            ).count()

        return {
            "agent_id": agent_id,
            "time_range_hours": hours,
            "total_requests": total_requests,
            "avg_risk_score": round(avg_risk_score, 4),
            "violations_detected": violations_detected,
            "warnings_issued": warnings_issued,
            "automatic_rollbacks": automatic_rollbacks,
        }


def _log_audit(db: Session, agent_id: str, action: str, version_id: str = None,
               details: dict = None, actor: str = "production_monitor"):
    """Helper function to log audit events"""
    entry = AuditLog(
        agent_id=agent_id,
        version_id=version_id,
        action=action,
        actor=actor,
        details=json.dumps(details or {}),
    )
    db.add(entry)
    db.commit()


# Global monitor instance
production_monitor = ProductionMonitor()